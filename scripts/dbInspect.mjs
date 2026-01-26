import fs from 'node:fs';
import path from 'node:path';

function readDotEnv(dotEnvPath) {
  const env = {};
  if (!fs.existsSync(dotEnvPath)) return env;
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

function usage() {
  console.log('Usage:');
  console.log('  node scripts/dbInspect.mjs tables');
  console.log('  node scripts/dbInspect.mjs columns <table> [schema]');
  console.log('  node scripts/dbInspect.mjs sample <table> [limit]');
  console.log('  node scripts/dbInspect.mjs rows <table> [limit] [--select <cols>]');
  console.log('');
  console.log('Env (from .env):');
  console.log('  VITE_SUPABASE_URL (or SUPABASE_URL)');
  console.log('  VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)');
  console.log('  SUPABASE_SERVICE_ROLE_KEY (optional; allows bypassing RLS)');
  console.log('');
  console.log('Notes:');
  console.log('  - `tables` and `columns` require SQL helper functions (see supabase/introspection.sql).');
  console.log('  - `sample` uses PostgREST and may return 0 rows if RLS blocks access.');
  console.log('  - `rows` prints JSON rows and always strips the `password` field if present.');
}

const env = {
  ...readDotEnv(path.join(process.cwd(), '.env')),
  ...process.env,
};

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing Supabase env vars. Ensure .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  process.exitCode = 1;
  usage();
  process.exit();
}

const command = process.argv[2];
if (!command) {
  usage();
  process.exitCode = 1;
  process.exit();
}

const authKey = serviceKey || anonKey;
const headers = {
  apikey: authKey,
  Authorization: `Bearer ${authKey}`,
  'Content-Type': 'application/json',
};

async function callRpc(fnName, body) {
  const url = new URL(`/rest/v1/rpc/${fnName}`, supabaseUrl);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`RPC ${fnName} failed: HTTP ${res.status} ${res.statusText}\n${txt.slice(0, 800)}`);
  }

  return await res.json();
}

async function sampleTable(table, limit) {
  const url = new URL(`/rest/v1/${encodeURIComponent(table)}`, supabaseUrl);
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sample failed: HTTP ${res.status} ${res.statusText}\n${txt.slice(0, 800)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    console.log('Unexpected response type:', typeof data);
    return;
  }

  console.log(`${table}: ${data.length} row(s) returned`);
  if (data.length > 0) {
    console.log('columns (inferred from first row):');
    console.log(Object.keys(data[0]).join(', '));
  } else {
    console.log('No rows visible (table empty or RLS filtered).');
  }
}

function parseOption(args, name) {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  for (const a of args) {
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1);
  }
  return undefined;
}

async function fetchRows(table, limit, select) {
  const url = new URL(`/rest/v1/${encodeURIComponent(table)}`, supabaseUrl);
  url.searchParams.set('select', select);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Rows failed: HTTP ${res.status} ${res.statusText}\n${txt.slice(0, 800)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    console.log('Unexpected response type:', typeof data);
    return;
  }

  for (const row of data) {
    if (row && typeof row === 'object' && 'password' in row) delete row.password;
  }

  console.log(JSON.stringify(data, null, 2));
}

try {
  if (command === 'tables') {
    const schema = process.argv[3] || 'public';
    const rows = await callRpc('eachr_list_tables', { p_schema: schema });
    for (const r of rows) {
      console.log(`${r.table_schema}.${r.table_name}`);
    }
  } else if (command === 'columns') {
    const table = process.argv[3];
    const schema = process.argv[4] || 'public';
    if (!table) {
      console.error('Missing table name.');
      usage();
      process.exitCode = 1;
    } else {
      const rows = await callRpc('eachr_table_columns', { p_schema: schema, p_table: table });
      for (const r of rows) {
        console.log(`${r.ordinal_position}\t${r.column_name}\t${r.data_type}\tnullable=${r.is_nullable}`);
      }
    }
  } else if (command === 'sample') {
    const table = process.argv[3];
    const limit = Number(process.argv[4] || '1');
    if (!table) {
      console.error('Missing table name.');
      usage();
      process.exitCode = 1;
    } else {
      await sampleTable(table, Number.isFinite(limit) && limit > 0 ? limit : 1);
    }
  } else if (command === 'rows') {
    const table = process.argv[3];
    const limit = Number(process.argv[4] || '2');
    const extraArgs = process.argv.slice(5);
    const userSelect = parseOption(extraArgs, '--select');

    if (!table) {
      console.error('Missing table name.');
      usage();
      process.exitCode = 1;
    } else {
      const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 2;
      const defaultSelect =
        table === 'employees'
          ? 'id,email,fname,lname,position,department,depot,role,status,created_at'
          : '*';
      await fetchRows(table, normalizedLimit, userSelect || defaultSelect);
    }
  } else {
    usage();
    process.exitCode = 1;
  }
} catch (e) {
  console.error(String(e?.message ?? e));
  console.log('');
  console.log('If this is `tables`/`columns`, install the SQL helpers from supabase/introspection.sql.');
  console.log('For local Supabase, you can run `npx supabase migration up` (recommended) or paste the SQL into Supabase Studio SQL editor.');
  process.exitCode = 1;
}
