# How to Fix Employee Login Issue

## The Problem

The employee account credentials are being sent via email, but the login fails because:
1. The Supabase Auth account might not be created
2. Email confirmation might be required (preventing login)
3. The profile might not have the correct role

## Solution Options

### Option 1: Disable Email Confirmation (Easiest)

1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Enable email confirmations" or "Confirm email"
3. **Disable it** (turn it off)
4. This allows users to log in immediately after signup

### Option 2: Use Supabase Admin API to Create Users

Since you can't create auth users via SQL, you need to use the Admin API. Here's a Node.js script you can run:

```javascript
// create-employee-auth.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const serviceRoleKey = 'YOUR_SERVICE_ROLE_KEY'; // Get from Supabase Dashboard → Settings → API

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createEmployeeAuth(email, password, firstName, lastName) {
  // Create auth user (bypasses email confirmation)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    }
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    return { error: authError };
  }

  const userId = authData.user.id;

  // Create profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      email: email,
      role: 'Employee',
      first_name: firstName,
      last_name: lastName,
    });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    return { error: profileError };
  }

  console.log('✅ Employee auth account created successfully!');
  return { success: true, userId };
}

// Usage:
createEmployeeAuth(
  'ladalem@roadwise.com',
  'LAdalem20051117!',
  'Lorenz',
  'Adalem'
);
```

### Option 3: Fix Existing Account (If Auth User Exists)

If the auth user exists but can't log in:

1. **Check if email is confirmed:**
   ```sql
   SELECT id, email, email_confirmed_at, confirmed_at
   FROM auth.users
   WHERE email = 'ladalem@roadwise.com';
   ```

2. **If email_confirmed_at is NULL, manually confirm it:**
   - Go to Supabase Dashboard → Authentication → Users
   - Find the user
   - Click "Confirm Email" or manually set `email_confirmed_at`

3. **Update profile role:**
   ```sql
   UPDATE profiles
   SET role = 'Employee'
   WHERE email = 'ladalem@roadwise.com';
   ```

## Quick Diagnostic Steps

1. **Run the diagnostic SQL** (`check_employee_account.sql`) to see what's missing
2. **Check Supabase Dashboard → Authentication → Users** for the employee email
3. **Check if email confirmation is enabled** in Auth settings
4. **Check browser console** when trying to log in for specific error messages

## Most Common Fix

**90% of the time, the issue is email confirmation being enabled.**

**Quick Fix:**
1. Go to Supabase Dashboard → Authentication → Settings
2. Disable "Enable email confirmations"
3. Try logging in again

If that doesn't work, the auth user might not have been created. In that case, use Option 2 (Admin API) to create the account manually.

