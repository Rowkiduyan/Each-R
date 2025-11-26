# Reset Employee Password - Quick Fix

## The Problem
The error "Invalid login credentials" means the password in Supabase Auth doesn't match what you're trying to use. This could happen if:
1. The account creation failed silently
2. The password was changed
3. The password format is different than expected

## Solution 1: Reset Password via Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find the user `ladalem@roadwise.com`
3. Click on the user
4. Click **"Send password recovery"** button
5. Check the email inbox for `ladalem@roadwise.com` (or the applicant's email)
6. Click the reset link and set a new password
7. Try logging in with the new password

## Solution 2: Manually Set Password via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find the user `ladalem@roadwise.com`
3. Click on the user
4. Look for **"Update user"** or **"Edit"** option
5. Set a new password directly
6. Save changes
7. Try logging in with the new password

## Solution 3: Recreate the Account (If it doesn't exist)

If the account doesn't exist in Supabase Auth, you need to create it. The code should do this automatically, but if it failed, you can:

### Option A: Use Supabase Dashboard
1. Go to **Authentication** → **Users** → **"Add user"**
2. Enter:
   - Email: `ladalem@roadwise.com`
   - Password: `LAdalem20051117!` (or a new password)
   - **Auto Confirm User**: ✅ (check this box)
3. Click **"Create user"**
4. Then run the SQL to ensure profile exists:
   ```sql
   INSERT INTO profiles (id, email, role, first_name, last_name)
   SELECT 
       id,
       email,
       'Employee',
       'Lorenz Vincel',
       'Adalem'
   FROM auth.users
   WHERE email = 'ladalem@roadwise.com'
   ON CONFLICT (id) DO UPDATE SET role = 'Employee';
   ```

### Option B: Fix the Code to Use Admin API

The current code uses `supabase.auth.signUp()` which might require email confirmation. We need to use the Admin API instead. However, this requires server-side code or an Edge Function.

## Solution 4: Check What Password Was Actually Set

The password should be: `LAdalem20051117!`

But let's verify:
- First initial: `L` (capital)
- Last name: `Adalem` → `Adalem` (capital A, rest lowercase)
- Birthday: `20051117` (November 17, 2005)
- Exclamation: `!`

**Make sure:**
- No extra spaces
- All characters match exactly
- The exclamation mark is included

## Quick Test

Try this password format (if birthday is different):
- If birthday is `2005-11-17`, the password might be: `LAdalem20051117!`
- If birthday format is different, check the actual birthday in the application data

## Most Likely Fix

**Just reset the password via Supabase Dashboard** (Solution 1) - it's the fastest and most reliable way.

