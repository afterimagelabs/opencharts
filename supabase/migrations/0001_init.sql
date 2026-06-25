-- OpenCharts multi-tenant foundation.
--
-- Multi-tenant: many law firms can sign up, each with their own
-- providers / records-requests / events. Per-tenant API keys gate the
-- create-request API; per-(tenant, service) webhook secrets gate the
-- inbound webhook adapters; magic-link auth (Supabase auth.users) gates
-- the in-page authoring UI for notes / incomplete flags.
--
-- The public_tracking_hash on a request is a 22-char unguessable token
-- (132 bits of entropy) that grants read-only access to that request's
-- timeline. Anyone with the hash can view the timeline at
-- opencharts.org/request/<hash>; nobody without the hash can.

create extension if not exists pgcrypto;

-- =========================================================
-- TENANTS
-- =========================================================
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text not null,
  created_at timestamptz not null default now()
);

comment on table tenants is 'A law firm (or other org) using OpenCharts to track its outbound records requests.';

-- =========================================================
-- TENANT USERS
-- Joins auth.users (Supabase auth) to a tenant. A row exists
-- when a user has been invited and signed in at least once via
-- magic link.
-- =========================================================
create table tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'ops', 'viewer')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index tenant_users_user_idx on tenant_users (user_id);

comment on table tenant_users is 'Membership of an auth.users row in a tenant. Authoring UI uses this for RLS scope.';

-- =========================================================
-- TENANT API KEYS
-- Used to authenticate the create-request API (POST
-- /api/v1/requests) and any other tenant-stack API calls.
-- The plaintext secret is shown ONCE at creation; we store
-- only the SHA-256 hash.
-- =========================================================
create table tenant_api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  prefix text not null,                  -- first 8 hex chars of token, shown in UI
  hashed_secret text not null,           -- SHA-256 hex of full token
  name text not null,                    -- human label, e.g. 'CMS integration'
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index tenant_api_keys_prefix_idx on tenant_api_keys (prefix) where revoked_at is null;
create index tenant_api_keys_tenant_idx on tenant_api_keys (tenant_id);

comment on table tenant_api_keys is 'API keys authenticating tenant-owned write calls. Secret never round-tripped after creation.';

-- =========================================================
-- WEBHOOK SECRETS
-- One secret per (tenant, service). Inbound webhook adapters
-- verify the X-OpenCharts-Webhook-Secret header against this.
-- Same storage pattern as tenant_api_keys.
-- =========================================================
create table webhook_secrets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  service text not null check (service in ('gmail', 'humblefax', 'twilio', 'mailgun')),
  prefix text not null,
  hashed_secret text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (tenant_id, service, revoked_at)
);

create index webhook_secrets_prefix_idx on webhook_secrets (prefix) where revoked_at is null;

comment on table webhook_secrets is 'Per-service shared secrets that inbound webhook adapters check.';

-- =========================================================
-- REQUESTS
-- One row per records request. public_tracking_hash is the
-- capability that grants read access to the timeline.
-- patient_ref is an opaque correlation id supplied by the
-- tenant (e.g. their internal case id); intentionally NOT
-- PHI-shaped to keep PHI out of OpenCharts wherever possible.
-- =========================================================
create table requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  public_tracking_hash text not null unique,

  provider_name text,
  provider_org text,
  provider_phone text,
  provider_fax text,
  provider_email text,

  patient_ref text,

  initial_request_at timestamptz,
  records_received_at timestamptz,
  records_incomplete_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index requests_tenant_created_idx on requests (tenant_id, created_at desc);
create index requests_tenant_hash_idx on requests (tenant_id, public_tracking_hash);

comment on table requests is 'A records request a tenant has initiated against a provider. Backs opencharts.org/request/<hash>.';

-- Hash generator: 16 random bytes → URL-safe base64 → strip '=' padding.
-- Same format as the CMS providers.public_tracking_hash trigger so the
-- public URL layout is identical across deployments.
create or replace function opencharts_generate_tracking_hash()
returns text as $$
  select replace(
    translate(encode(gen_random_bytes(16), 'base64'), '+/', '-_'),
    '=',
    ''
  );
$$ language sql volatile;

create or replace function requests_set_tracking_hash()
returns trigger as $$
begin
  if new.public_tracking_hash is null or new.public_tracking_hash = '' then
    new.public_tracking_hash := opencharts_generate_tracking_hash();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger requests_set_tracking_hash_trg
before insert on requests
for each row
execute function requests_set_tracking_hash();

-- =========================================================
-- EVENTS
-- One row per timeline event. The (request_id, source,
-- external_id) unique index dedupes when the same provider
-- webhook is delivered twice (HumbleFax retries, Pub/Sub
-- redelivery, etc.).
-- =========================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  type text not null check (type in (
    'fax', 'email', 'call',
    'records_received', 'records_incomplete',
    'note_added'
  )),
  occurred_at timestamptz not null,
  source text not null check (source in (
    'webhook:gmail', 'webhook:humblefax', 'webhook:humblefax_inbound',
    'webhook:twilio', 'webhook:mailgun',
    'api', 'ui'
  )),
  external_id text,
  incomplete boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references tenant_users(id),
  created_at timestamptz not null default now()
);

create index events_request_occurred_idx on events (request_id, occurred_at);
create unique index events_dedup_idx
  on events (request_id, source, external_id)
  where external_id is not null;

comment on table events is 'Timeline events for a records request. fax/email/call come from webhooks or API; note_added from UI.';

-- =========================================================
-- NOTES
-- Free-text notes scoped to a request, optionally pinned to a
-- specific event (e.g. "this fax was illegible").
-- =========================================================
create table notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  content text not null,
  source text not null check (source in ('api', 'ui')),
  created_by uuid references tenant_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_request_idx on notes (request_id, created_at);

create or replace function notes_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger notes_set_updated_at_trg
before update on notes
for each row
execute function notes_set_updated_at();

comment on table notes is 'Free-text notes from the authoring UI or tenant API. Surfaced on the public timeline.';

-- =========================================================
-- ROW LEVEL SECURITY
--
-- Pattern:
--   * service_role bypasses RLS — used by CF Pages Functions
--     for both anon-read (track endpoint) and tenant-API paths.
--     Those paths handle auth themselves before querying.
--   * authenticated users can read/write only data scoped to a
--     tenant they belong to (via tenant_users).
--   * anon role gets no direct table access; the public
--     timeline endpoint goes through service_role with
--     hash-based lookup.
-- =========================================================

alter table tenants enable row level security;
alter table tenant_users enable row level security;
alter table tenant_api_keys enable row level security;
alter table webhook_secrets enable row level security;
alter table requests enable row level security;
alter table events enable row level security;
alter table notes enable row level security;

-- Helper: tenants the current auth.uid() belongs to.
-- SECURITY DEFINER so the lookup itself doesn't recurse through
-- tenant_users RLS (which is what would happen with a plain
-- subquery — see CLAUDE.md "infinite recursion (42P17)").
create or replace function current_tenant_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from tenant_users where user_id = auth.uid();
$$;

revoke all on function current_tenant_ids() from public;
grant execute on function current_tenant_ids() to authenticated;

-- Tenants: members can read their own tenant.
create policy tenants_member_read on tenants
  for select to authenticated
  using (id in (select current_tenant_ids()));

-- Tenant users: members can read other members in the same tenant.
create policy tenant_users_member_read on tenant_users
  for select to authenticated
  using (tenant_id in (select current_tenant_ids()));

-- API keys: members can read keys in their tenant. No insert/update via
-- RLS — done through API endpoints under service_role.
create policy tenant_api_keys_member_read on tenant_api_keys
  for select to authenticated
  using (tenant_id in (select current_tenant_ids()));

-- Webhook secrets: same.
create policy webhook_secrets_member_read on webhook_secrets
  for select to authenticated
  using (tenant_id in (select current_tenant_ids()));

-- Requests: members can read all requests in their tenant.
create policy requests_member_read on requests
  for select to authenticated
  using (tenant_id in (select current_tenant_ids()));

-- Events: members can read events on requests in their tenant.
create policy events_member_read on events
  for select to authenticated
  using (
    request_id in (
      select id from requests where tenant_id in (select current_tenant_ids())
    )
  );

-- Notes: members can read, insert, and update notes they themselves
-- created. (No update/delete for other members' notes — keeps the
-- audit trail intact.)
create policy notes_member_read on notes
  for select to authenticated
  using (
    request_id in (
      select id from requests where tenant_id in (select current_tenant_ids())
    )
  );

create policy notes_member_insert on notes
  for insert to authenticated
  with check (
    request_id in (
      select id from requests where tenant_id in (select current_tenant_ids())
    )
    and created_by in (
      select id from tenant_users where user_id = auth.uid()
    )
  );

create policy notes_self_update on notes
  for update to authenticated
  using (created_by in (select id from tenant_users where user_id = auth.uid()))
  with check (created_by in (select id from tenant_users where user_id = auth.uid()));
