-- Authoring UI plumbing: tenant_user invites, events update policy, and
-- a SECURITY DEFINER helper that claims an invite when the invitee
-- signs in via magic link.

-- Make user_id nullable so a tenant admin can create a tenant_users row
-- before the invitee has authenticated. Pending rows (user_id IS NULL)
-- are matched on email when claim_tenant_membership() runs.
alter table tenant_users alter column user_id drop not null;

-- Without a partial unique, you could invite the same email twice.
create unique index tenant_users_pending_email_idx
  on tenant_users (tenant_id, lower(email))
  where user_id is null;

-- Authenticated members can update events on requests in their tenant.
-- Used for the "flag incomplete" toggle in the authoring UI. We don't
-- distinguish roles yet — any member who can read can also update. If
-- we add a viewer role later, this policy gets a role check.
create policy events_member_update on events
  for update to authenticated
  using (
    request_id in (
      select id from requests where tenant_id in (select current_tenant_ids())
    )
  )
  with check (
    request_id in (
      select id from requests where tenant_id in (select current_tenant_ids())
    )
  );

-- claim_tenant_membership(): attach the current auth.uid() to any
-- pending tenant_users rows that match the user's email. Called by the
-- SPA right after a successful magic-link sign-in.
create or replace function claim_tenant_membership()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_count integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if v_email is null or length(v_email) = 0 then
    return 0;
  end if;

  with claimed as (
    update tenant_users
    set user_id = auth.uid()
    where user_id is null
      and lower(email) = lower(v_email)
    returning id
  )
  select count(*) into v_count from claimed;

  return v_count;
end;
$$;

revoke all on function claim_tenant_membership() from public;
grant execute on function claim_tenant_membership() to authenticated;
