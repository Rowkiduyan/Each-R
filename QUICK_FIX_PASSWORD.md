# Quick Fix: Invalid Login Credentials

## The Problem
You're getting "Invalid login credentials" which means the password in Supabase Auth doesn't match what you're trying to use.

## Fastest Solution: Reset Password via Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Go to Authentication → Users**
   - Find `ladalem@roadwise.com` in the list
   - Click on the user

3. **Reset the Password**
   - Click **"Send password recovery"** button
   - OR manually set a new password if that option is available
   - Set password to: `LAdalem20051117!` (or any password you want)

4. **Try Logging In Again**
   - Use the new password you just set

## Alternative: Use Edge Function (If you want to automate this)

I've created an Edge Function `create-employee-auth` that can create/update employee accounts with proper passwords using the Admin API.

### To Deploy:
1. Copy the code from `supabase/functions/create-employee-auth/index.ts`
2. Deploy it via Supabase Dashboard (Edge Functions → New Function)
3. Set the secret: `SUPABASE_SERVICE_ROLE_KEY` (get from Settings → API)

### To Use:
Call it from your code when marking someone as hired, or manually invoke it with:
```json
{
  "email": "ladalem@roadwise.com",
  "password": "LAdalem20051117!",
  "firstName": "Lorenz Vincel",
  "lastName": "Adalem"
}
```

## Why This Happens

The `supabase.auth.signUp()` from client-side code might:
- Require email confirmation (even if disabled in settings)
- Fail silently if there's a network issue
- Not work properly if the user already exists

Using the Admin API (via Edge Function) bypasses these issues.

## Recommended: Use Dashboard Reset (Fastest)

Just reset the password via Supabase Dashboard - it takes 30 seconds and will definitely work!

