// updateRole.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nokbftmzugwyfgyprcwh.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5va2JmdG16dWd3eWZneXByY3doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY5ODM0MiwiZXhwIjoyMDc2Mjc0MzQyfQ.6RbTpKtk774ezqaoeB4AuLZAqYiE4VYUaC4cfrEivco'; // <-- paste service role key

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

  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    die('❌ SERVICE_ROLE_KEY is missing. Paste your service role key in updateRole.mjs.');
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
