import fs from 'node:fs';
import path from 'node:path';

function readDotEnv(dotEnvPath) {
  const env = {};
  if (!fs.existsSync(dotEnvPath)) return env;
  const text = fs.readFileSync(dotEnvPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1);
      }
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.log('Usage: node scripts/findAuthUserByEmail.mjs <email>');
    process.exitCode = 1;
    return;
  }

  const email = String(emailArg).trim().toLowerCase();

  const env = { ...readDotEnv(path.join(process.cwd(), '.env')), ...process.env };
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exitCode = 1;
    return;
  }

  const perPage = 1000;
  let page = 1;
  let found = null;

  while (page <= 20 && !found) {
    const url = new URL('/auth/v1/admin/users', supabaseUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }

    if (!res.ok) {
      console.log(JSON.stringify({ ok: false, status: res.status, statusText: res.statusText, error: json || text }, null, 2));
      return;
    }

    const users = json?.users || [];
    if (users.length === 0) break;

    found = users.find((u) => String(u?.email || '').trim().toLowerCase() === email) || null;
    if (found) break;
    if (users.length < perPage) break;
    page += 1;
  }

  if (!found) {
    console.log(JSON.stringify({ ok: true, found: false, email }, null, 2));
    return;
  }

  const safe = {
    ok: true,
    found: true,
    id: found.id,
    email: found.email,
    email_confirmed_at: found.email_confirmed_at || null,
    confirmed_at: found.confirmed_at || null,
    created_at: found.created_at || null,
    last_sign_in_at: found.last_sign_in_at || null,
    user_metadata: found.user_metadata || null,
  };

  console.log(JSON.stringify(safe, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exitCode = 1;
});
