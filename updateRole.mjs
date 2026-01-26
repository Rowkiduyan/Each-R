// updateRole.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const env = {
  ...readDotEnv(path.join(process.cwd(), '.env')),
  ...process.env,
};

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// Accept email from CLI (node updateRole.mjs email@example.com)
const EMAIL = (process.argv[2] || '').trim();

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function isUUID(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test((v || '').trim());
}

async function findUserIdByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (user) return user.id;

    if (data.users.length < perPage) return null; // no more pages
    page++;
  }
}

async function main() {
  console.log('▶ Starting role update...');

  if (!SUPABASE_URL) {
    die('❌ Missing SUPABASE_URL. Set SUPABASE_URL or VITE_SUPABASE_URL in .env.');
  }
  if (!SERVICE_ROLE_KEY) {
    die('❌ Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env (never in client code).');
  }
  if (!EMAIL) {
    die('❌ Usage: node updateRole.mjs applicant@example.com');
  }

  console.log('🔗 Connecting to:', SUPABASE_URL);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  console.log('🔎 Looking up user by email:', EMAIL);
  const userId = await findUserIdByEmail(supabase, EMAIL).catch(err => {
    die('❌ Failed to list users: ' + err.message);
  });

  if (!userId) {
    die('❌ No user found with that email.');
  }
  console.log('✅ Found user id:', userId);

  if (!isUUID(userId)) {
    die('❌ Retrieved id is not a valid UUID: ' + userId);
  }

  console.log('⚙ Updating role in app_metadata & user_metadata to "Applicant"...');
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'Applicant' },
    user_metadata: { role: 'Applicant' },
  });

  if (error) {
    die('❌ Update failed: ' + error.message);
  }

  console.log('✅ Role updated successfully!');
  console.log('app_metadata:', data.user.app_metadata);
  console.log('user_metadata:', data.user.user_metadata);
  process.exit(0);
}

main().catch(err => die('❌ Fatal: ' + err.message));
