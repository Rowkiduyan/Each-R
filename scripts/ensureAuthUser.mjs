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

async function listAllUsers({ supabaseUrl, serviceKey, perPage = 1000, maxPages = 20 }) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
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
      throw new Error(`List users failed: HTTP ${res.status} ${res.statusText}\n${text.slice(0, 800)}`);
    }

    const users = json?.users || [];
    all.push(...users);
    if (users.length < perPage) break;
  }
  return all;
}

async function main() {
  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];
  const firstName = process.argv[4] || '';
  const lastName = process.argv[5] || '';

  if (!emailArg || !passwordArg) {
    console.log('Usage: node scripts/ensureAuthUser.mjs <email> <password> [firstName] [lastName]');
    process.exitCode = 1;
    return;
  }

  const email = String(emailArg).trim().toLowerCase();
  const password = String(passwordArg);

  const env = { ...readDotEnv(path.join(process.cwd(), '.env')), ...process.env };
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exitCode = 1;
    return;
  }

  const users = await listAllUsers({ supabaseUrl, serviceKey });
  const existing = users.find((u) => String(u?.email || '').trim().toLowerCase() === email) || null;

  if (existing) {
    const updUrl = new URL(`/auth/v1/admin/users/${existing.id}`, supabaseUrl);
    const res = await fetch(updUrl, {
      method: 'PUT',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata || {}),
          first_name: firstName,
          last_name: lastName,
          role: 'Employee',
        },
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Update user failed: HTTP ${res.status} ${res.statusText}\n${text.slice(0, 800)}`);
    }

    console.log(JSON.stringify({ ok: true, action: 'updated', id: existing.id, email: existing.email }, null, 2));
    return;
  }

  const createUrl = new URL('/auth/v1/admin/users', supabaseUrl);
  const res = await fetch(createUrl, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, role: 'Employee' },
    }),
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }

  if (!res.ok) {
    throw new Error(`Create user failed: HTTP ${res.status} ${res.statusText}\n${text.slice(0, 800)}`);
  }

  console.log(JSON.stringify({ ok: true, action: 'created', id: json?.id || json?.user?.id || null, email }, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exitCode = 1;
});
