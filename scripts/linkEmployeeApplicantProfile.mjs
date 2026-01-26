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

function usage() {
  console.log('Usage:');
  console.log('  node scripts/linkEmployeeApplicantProfile.mjs <workEmail> [personalEmail]');
  console.log('');
  console.log('What it does:');
  console.log('  - Finds employees row by work email');
  console.log('  - Finds/sets employees.auth_user_id (via Auth admin listUsers)');
  console.log('  - Finds latest application by personal email inside payload');
  console.log('  - Upserts applicants row with id=employees.auth_user_id and employee_id=employees.id');
  console.log('');
  console.log('Requires .env:');
  console.log('  VITE_SUPABASE_URL (or SUPABASE_URL)');
  console.log('  SUPABASE_SERVICE_ROLE_KEY');
}

async function fetchJson(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    const msg = json?.message || json?.error_description || json?.error || text || res.statusText;
    const err = new Error(`HTTP ${res.status} ${res.statusText}: ${msg}`);
    err.status = res.status;
    err.payload = json || text;
    throw err;
  }
  return json;
}

async function findAuthUserIdByEmail({ supabaseUrl, serviceKey, email }) {
  const perPage = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const url = new URL('/auth/v1/admin/users', supabaseUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));

    const json = await fetchJson(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });

    const users = json?.users || [];
    const found = users.find((u) => String(u?.email || '').trim().toLowerCase() === email) || null;
    if (found?.id) return found.id;
    if (users.length < perPage) break;
  }
  return null;
}

function safeJsonParse(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  if (typeof v !== 'string') return null;
  try { return JSON.parse(v); } catch { return null; }
}

function extractSource(payloadObj) {
  const p = payloadObj && typeof payloadObj === 'object' ? payloadObj : {};
  const formObj = p.form && typeof p.form === 'object' ? p.form : {};
  const applicantObj = p.applicant && typeof p.applicant === 'object' ? p.applicant : {};
  return { ...formObj, ...applicantObj, ...p };
}

async function main() {
  const workEmailArg = process.argv[2];
  const personalEmailArg = process.argv[3];
  if (!workEmailArg) {
    usage();
    process.exitCode = 1;
    return;
  }

  const workEmail = String(workEmailArg).trim().toLowerCase();

  const env = { ...readDotEnv(path.join(process.cwd(), '.env')), ...process.env };
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exitCode = 1;
    return;
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  // 1) Load employee row
  const empUrl = new URL('/rest/v1/employees', supabaseUrl);
  empUrl.searchParams.set('select', 'id,email,personal_email,auth_user_id,contact_number,fname,lname,mname,birthday');
  empUrl.searchParams.set('email', `eq.${workEmail}`);
  empUrl.searchParams.set('limit', '1');

  const employeeRows = await fetchJson(empUrl, { headers });
  const employee = Array.isArray(employeeRows) ? employeeRows[0] : null;
  if (!employee?.id) {
    throw new Error(`No employees row found for work email ${workEmail}`);
  }

  // 2) Ensure auth_user_id
  let authUserId = employee.auth_user_id || null;
  if (!authUserId) {
    authUserId = await findAuthUserIdByEmail({ supabaseUrl, serviceKey, email: workEmail });
    if (!authUserId) {
      throw new Error(`Could not find auth user for work email ${workEmail}`);
    }

    const patchUrl = new URL('/rest/v1/employees', supabaseUrl);
    patchUrl.searchParams.set('email', `eq.${workEmail}`);
    await fetchJson(patchUrl, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ auth_user_id: authUserId }),
    });
  }

  // 3) Find application by personal email in payload
  const personalEmail = String(personalEmailArg || employee.personal_email || '').trim().toLowerCase();
  if (!personalEmail) {
    throw new Error('Missing personal email. Provide it as second arg or set employees.personal_email.');
  }

  const appUrl = new URL('/rest/v1/applications', supabaseUrl);
  appUrl.searchParams.set('select', 'id,payload,created_at,status');
  appUrl.searchParams.set(
    'or',
    `(
      payload->>email.eq."${personalEmail}",
      payload->form->>email.eq."${personalEmail}",
      payload->applicant->>email.eq."${personalEmail}"
    )`.replace(/\s+/g, '')
  );
  appUrl.searchParams.set('order', 'created_at.desc');
  appUrl.searchParams.set('limit', '1');

  const apps = await fetchJson(appUrl, { headers });
  const app = Array.isArray(apps) ? apps[0] : null;
  if (!app?.id) {
    throw new Error(`No applications found matching personal email ${personalEmail}`);
  }

  const payloadObj = safeJsonParse(app.payload) || {};
  const src = extractSource(payloadObj);

  // 4) Upsert applicants row (id = employee auth uid)
  const applicantUpsert = {
    id: authUserId,
    email: personalEmail,
    fname: employee.fname || src.firstName || src.fname || src.first_name || null,
    lname: employee.lname || src.lastName || src.lname || src.last_name || null,
    mname: employee.mname || src.middleName || src.mname || src.middle_name || null,
    contact_number: employee.contact_number || src.contact_number || src.phone || null,
    address: src.address || null,
    sex: src.sex || src.gender || null,
    birthday: employee.birthday || src.birthday || src.birthdate || src.birth_date || null,
    marital_status: src.marital_status || src.maritalStatus || src.marital || null,
    barangay: src.barangay || null,
    city: src.city || null,
    street: src.street || null,
    province: src.province || null,
    zip: src.zip || null,
    unit_house_number: src.unit_house_number || src.unitHouseNumber || null,
    postal_code: src.postal_code || src.postalCode || null,
    employee_id: employee.id,
    is_hired: true,
    hired_at: new Date().toISOString(),
  };

  const upsertUrl = new URL('/rest/v1/applicants', supabaseUrl);
  upsertUrl.searchParams.set('on_conflict', 'id');

  const upsertRes = await fetchJson(upsertUrl, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([applicantUpsert]),
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        workEmail,
        personalEmail,
        employeeId: employee.id,
        authUserId,
        applicationId: app.id,
        applicantsUpserted: Array.isArray(upsertRes) ? upsertRes.length : 0,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  if (e?.payload) {
    console.error('Details:', typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload, null, 2));
  }
  process.exitCode = 1;
});
