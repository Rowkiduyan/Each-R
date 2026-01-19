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
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.log('Usage: node scripts/authPasswordGrant.mjs <email> <password>');
    process.exitCode = 1;
    return;
  }

  const env = { ...readDotEnv(path.join(process.cwd(), '.env')), ...process.env };
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase URL/anon key in .env');
    process.exitCode = 1;
    return;
  }

  const url = new URL('/auth/v1/token', supabaseUrl);
  url.searchParams.set('grant_type', 'password');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: String(email).trim(), password: String(password) }),
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }

  if (!res.ok) {
    console.log(JSON.stringify({ ok: false, status: res.status, statusText: res.statusText, error: json || text }, null, 2));
    return;
  }

  console.log(JSON.stringify({ ok: true, status: res.status, user_id: json?.user?.id || json?.user_id || null }, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exitCode = 1;
});
