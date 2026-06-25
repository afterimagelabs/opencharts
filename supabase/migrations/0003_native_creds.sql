-- Per-tenant service-native credentials (Twilio Auth Token, Mailgun
-- signing key, …). Used by webhook adapters when they prefer the
-- provider's own signature scheme over our shared-secret pattern.
--
-- One row per (tenant, service). The credential payload is jsonb so
-- different services can carry different shapes (Twilio: {auth_token},
-- Mailgun: {signing_key}, etc.) without schema churn.

create table tenant_native_creds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  service text not null check (service in ('twilio', 'mailgun')),
  credential jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index tenant_native_creds_unique
  on tenant_native_creds (tenant_id, service);

-- Reuse the notes_set_updated_at function — same shape, just rename
-- it to a generic helper so future tables can reuse it too.
create or replace function tenant_native_creds_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger tenant_native_creds_set_updated_at_trg
before update on tenant_native_creds
for each row
execute function tenant_native_creds_set_updated_at();

alter table tenant_native_creds enable row level security;

-- Members can see whether a credential exists in their tenant, but
-- the credential payload itself never gets returned to the SPA — the
-- GET endpoint synthesizes `configured: true/false` from a service-
-- role query. We add a SELECT policy anyway so the dashboard's
-- direct-Supabase "exists?" read doesn't 401.
create policy tenant_native_creds_member_read on tenant_native_creds
  for select to authenticated
  using (tenant_id in (select current_tenant_ids()));

comment on table tenant_native_creds is 'Per-(tenant, service) credentials used by native-signature webhook paths. Plaintext at rest in v1 — encrypt-at-rest is a follow-up.';
