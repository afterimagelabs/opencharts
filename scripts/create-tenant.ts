// Bootstrap script: create a tenant and mint its first API key.
//
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npm run tenant:create -- --name "Some Firm" --email "ops@somefirm.com"
//
// The secret is printed exactly once. Capture it and store it in the
// tenant's own server-side secrets manager.

import { createClient } from '@supabase/supabase-js';
import { generateToken, sha256Hex, tokenPrefix } from '../functions/api/_lib/crypto';

interface Args {
  name?: string;
  email?: string;
  keyName?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--name') out.name = argv[++i];
    else if (arg === '--email') out.email = argv[++i];
    else if (arg === '--key-name') out.keyName = argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name || !args.email) {
    console.error('Usage: tenant:create -- --name "Firm Name" --email "ops@firm.com" [--key-name "Initial key"]');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .insert({ name: args.name, contact_email: args.email })
    .select('id, name')
    .single();

  if (tenantErr || !tenant) {
    console.error('Failed to create tenant:', tenantErr);
    process.exit(1);
  }

  const token = generateToken();
  const prefix = tokenPrefix(token);
  const hashed = await sha256Hex(token);

  const { data: apiKey, error: keyErr } = await supabase
    .from('tenant_api_keys')
    .insert({
      tenant_id: tenant.id,
      prefix,
      hashed_secret: hashed,
      name: args.keyName ?? 'Initial key',
    })
    .select('id, name, prefix')
    .single();

  if (keyErr || !apiKey) {
    console.error('Failed to create API key:', keyErr);
    process.exit(1);
  }

  console.log('Tenant created.');
  console.log(`  id:    ${tenant.id}`);
  console.log(`  name:  ${tenant.name}`);
  console.log('');
  console.log('Initial API key (store this — it will not be shown again):');
  console.log(`  prefix: ${apiKey.prefix}`);
  console.log(`  secret: ${token}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
