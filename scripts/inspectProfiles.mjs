import fs from 'node:fs';
import path from 'node:path';

function readDotEnv(dotEnvPath) {
  const env = {};
  const text = fs.readFileSync(dotEnvPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;

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

const env = readDotEnv(path.join(process.cwd(), '.env'));
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const endpoint = new URL('/rest/v1/profiles', url);
endpoint.searchParams.set('select', '*');
endpoint.searchParams.set('limit', '1');

const res = await fetch(endpoint, {
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  },
});

if (!res.ok) {
  const txt = await res.text();
  console.error(`HTTP ${res.status} ${res.statusText}`);
  console.error(txt.slice(0, 800));
  process.exit(2);
}

const data = await res.json();

if (!Array.isArray(data)) {
  console.log('Unexpected response type:', typeof data);
  process.exit(3);
}

if (data.length === 0) {
  console.log('profiles: 0 rows returned (table empty or RLS filtered).');
  console.log('Request succeeded, but cannot infer columns without at least one readable row.');
  process.exit(0);
}

const cols = Object.keys(data[0]);
console.log('profiles columns (from first returned row):');
console.log(cols.join(', '));
