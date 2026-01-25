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

function parseOption(args, name) {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  for (const a of args) {
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1);
  }
  return undefined;
}

function usage() {
  console.log('Usage:');
  console.log('  node scripts/resendEmployeeCredentials.mjs <personal_email> [--password <new_password>] [--app <app_base_url>] [--portal <portal_url>]');
  console.log('');
  console.log('Env (from .env):');
  console.log('  VITE_SUPABASE_URL (or SUPABASE_URL)');
  console.log('  SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY)');
  console.log('  VITE_APP_BASE_URL or APP_BASE_URL (optional)');
}

const env = {
  ...readDotEnv(path.join(process.cwd(), '.env')),
  ...process.env,
};

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const defaultAppBaseUrl = env.VITE_APP_BASE_URL || env.APP_BASE_URL || '';

const args = process.argv.slice(2);
const personalEmail = args[0];
const providedPassword = parseOption(args, '--password');
const appBaseUrlOverride = parseOption(args, '--app');
const portalUrlOverride = parseOption(args, '--portal');

if (!personalEmail) {
  usage();
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase env vars. Ensure .env has VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
};

function makeTempPassword(firstName, lastName) {
  const firstInitial = firstName ? String(firstName).trim().charAt(0).toUpperCase() : 'E';
  const lastPart = lastName ? String(lastName).trim().replace(/\s+/g, '') : 'Employee';
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${firstInitial}${lastPart}${yyyy}${mm}${dd}!`;
}

async function fetchEmployeeByPersonalEmail(email) {
  const url = new URL('/rest/v1/employees', supabaseUrl);
  url.searchParams.set('select', 'id,email,fname,lname,personal_email');
  url.searchParams.set('personal_email', `ilike.${email}`);
  url.searchParams.set('limit', '1');

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to lookup employee: HTTP ${res.status} ${res.statusText} ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : null;
}

async function invokeFunction(fnName, body) {
  const url = new URL(`/functions/v1/${fnName}`, supabaseUrl);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Function ${fnName} failed: HTTP ${res.status} ${res.statusText} ${text.slice(0, 500)}`);
  }
  if (json?.error) {
    throw new Error(`Function ${fnName} error: ${json.error}`);
  }
  return json;
}

(async () => {
  const employee = await fetchEmployeeByPersonalEmail(personalEmail);
  if (!employee?.email) {
    console.error('No employee found with personal_email:', personalEmail);
    process.exit(1);
  }

  const firstName = employee.fname || '';
  const lastName = employee.lname || '';
  const workEmail = employee.email;
  const newPassword = providedPassword || makeTempPassword(firstName, lastName);
  const appBaseUrl = appBaseUrlOverride || defaultAppBaseUrl || '';
  const portalUrl = portalUrlOverride || (appBaseUrl ? `${appBaseUrl.replace(/\/+$/, '')}/employee/login` : '');

  console.log('Resetting password for:', workEmail);
  await invokeFunction('admin-reset-password', {
    email: workEmail,
    new_password: newPassword,
    personal_email: personalEmail,
  });

  console.log('Sending credentials email to:', personalEmail);
  await invokeFunction('send-employee-credentials', {
    toEmail: personalEmail,
    employeeEmail: workEmail,
    employeePassword: newPassword,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    appBaseUrl,
    portalUrl,
  });

  console.log('Done. Credentials email sent.');
})().catch((err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});
