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

function getPayloadJobId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload?.meta?.job_id ||
    payload?.meta?.jobId ||
    payload?.job_id ||
    payload?.jobId ||
    null
  );
}

async function fetchAll({ supabaseUrl, key, pathName, params }) {
  const url = new URL(pathName, supabaseUrl);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${txt.slice(0, 800)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data;
}

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.log('Usage: node scripts/countHiredByJob.mjs <jobId>');
    process.exitCode = 1;
    return;
  }

  const env = {
    ...readDotEnv(path.join(process.cwd(), '.env')),
    ...process.env,
  };

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !key) {
    console.error('Missing Supabase URL/key. Ensure .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or service role).');
    process.exitCode = 1;
    return;
  }

  const directRows = await fetchAll({
    supabaseUrl,
    key,
    pathName: '/rest/v1/applications',
    params: {
      select: 'id,status,job_id',
      job_id: `eq.${jobId}`,
      limit: '10000',
    },
  });

  const hiredDirect = directRows.filter(
    (r) => String(r?.status || '').trim().toLowerCase() === 'hired'
  ).length;

  // Legacy rows: job_id null but payload contains job id
  const legacyRows = await fetchAll({
    supabaseUrl,
    key,
    pathName: '/rest/v1/applications',
    params: {
      select: 'id,status,job_id,payload',
      job_id: 'is.null',
      limit: '10000',
    },
  });

  const hiredLegacy = legacyRows.filter((r) => {
    if (String(r?.status || '').trim().toLowerCase() !== 'hired') return false;
    const pid = getPayloadJobId(r?.payload);
    return pid && String(pid) === String(jobId);
  }).length;

  const result = {
    jobId,
    hired: hiredDirect + hiredLegacy,
    hired_breakdown: { direct_job_id: hiredDirect, payload_fallback: hiredLegacy },
    totalApplicationsWithJobId: directRows.length,
    checkedLegacyRowsWithNullJobId: legacyRows.length,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exitCode = 1;
});
