// Tenant-authenticated member management.
//
// POST /api/v1/tenant-users   — invite a user by email. Inserts a row
//                                with user_id=NULL; the invitee claims
//                                it on first magic-link sign-in via
//                                the claim_tenant_membership() RPC.
// GET  /api/v1/tenant-users   — list members + pending invites.
//
// Auth: Authorization: Bearer <token> where <token> is either a tenant
// API key OR a Supabase JWT (signed-in dashboard user).

import { authenticateAnyTenant } from '../_lib/dualAuth';
import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';

const ALLOWED_ROLES = new Set(['admin', 'ops', 'viewer']);
// Loose RFC-5322ish check — we don't need full conformance, just to
// reject obviously-malformed input. Supabase's auth layer will do its
// own normalization when the user signs in.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteBody {
  email?: string;
  role?: string;
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateAnyTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  let body: InviteBody;
  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role ?? 'ops';
  if (!EMAIL_RE.test(email)) {
    return jsonError(400, 'bad_request', 'email is required and must look like an email address.');
  }
  if (!ALLOWED_ROLES.has(role)) {
    return jsonError(400, 'bad_request', 'role must be one of admin|ops|viewer.');
  }

  const { data, error } = await supabase
    .from('tenant_users')
    .insert({
      tenant_id: tenant.tenant_id,
      email,
      role,
      // user_id intentionally left NULL — claimed at first sign-in.
    })
    .select('id, email, role, created_at')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return jsonError(409, 'duplicate', 'A pending invite already exists for that email.');
    }
    console.error('[v1/tenant-users] insert failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse(
    {
      tenant_user: data,
      claim_instructions:
        'The invitee should visit any opencharts.org/request/<hash> URL belonging to your tenant and sign in with this email.',
    },
    { status: 201 },
  );
};

export const onRequestGet: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateAnyTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  const { data, error } = await supabase
    .from('tenant_users')
    .select('id, email, role, created_at, user_id')
    .eq('tenant_id', tenant.tenant_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[v1/tenant-users] list failed', error);
    return jsonError(500, 'internal_error');
  }

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    created_at: r.created_at,
    status: r.user_id ? ('active' as const) : ('pending' as const),
  }));

  return jsonResponse({ tenant_users: rows });
};
