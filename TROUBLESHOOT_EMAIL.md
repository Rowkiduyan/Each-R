# Troubleshooting: Email Not Sending

## Issue 1: Secret Name Mismatch ⚠️ **MOST LIKELY ISSUE**

Your secrets list shows `FROM_EMAIL`, but the function expects `SENDGRID_FROM_EMAIL`.

**Fix:**
1. Go to Edge Functions → Settings/Secrets in Supabase Dashboard
2. Add a new secret:
   - **Name:** `SENDGRID_FROM_EMAIL`
   - **Value:** Your sender email (e.g., `noreply@roadwise.com`)
3. You can keep `FROM_EMAIL` or delete it (the function won't use it)

**Note:** The function has a fallback to `"noreply@roadwise.com"`, but it's better to set the secret correctly.

---

## Issue 2: Check Function Logs

The function might be failing silently. Check the logs:

1. Go to Edge Functions in Supabase Dashboard
2. Click on `send-employee-credentials`
3. Click on the **"Logs"** tab
4. Look for error messages

**Common errors you might see:**
- `"SENDGRID_API_KEY not configured"` → Secret not set correctly
- `"Failed to send email"` → SendGrid API issue
- `"Missing required fields"` → Function not receiving correct data

---

## Issue 3: Verify SendGrid Configuration

### A. Check SendGrid API Key Permissions
1. Go to https://app.sendgrid.com
2. Navigate to **Settings** → **API Keys**
3. Click on your API key
4. Make sure it has **"Mail Send"** permission enabled

### B. Verify Sender Email in SendGrid
1. Go to **Settings** → **Sender Authentication**
2. Verify your sender email (`noreply@roadwise.com` or whatever you're using)
3. If not verified, you need to:
   - **Single Sender Verification:** Add and verify the email address
   - **Domain Authentication:** Verify your entire domain (recommended for production)

**Important:** SendGrid requires sender verification. Unverified senders may cause emails to fail or go to spam.

---

## Issue 4: Test the Function Manually

Test if the function works at all:

1. In Supabase Dashboard, go to Edge Functions
2. Click on `send-employee-credentials`
3. Go to the **"Invoke"** or **"Test"** tab
4. Use this test data:
```json
{
  "toEmail": "your-actual-email@example.com",
  "employeeEmail": "ladalem@roadwise.com",
  "employeePassword": "LAdalem19900101!",
  "firstName": "Lorenz",
  "lastName": "Adalem",
  "fullName": "Lorenz Vincel A. Adalem"
}
```
5. Click **"Invoke"**
6. Check:
   - The response (should show `{"success": true}`)
   - The logs for any errors
   - Your email inbox (and spam folder)

---

## Issue 5: Check Browser Console

When you mark an applicant as hired, check your browser's console:

1. Open Developer Tools (F12)
2. Go to the **Console** tab
3. Mark an applicant as hired
4. Look for any error messages related to:
   - `sendEmployeeAccountEmail`
   - Edge Function errors
   - Network errors

---

## Issue 6: Verify Function is Being Called

Add some debugging to see if the function is even being called:

1. Check the function logs in Supabase Dashboard
2. Look for any invocations when you mark someone as hired
3. If you see no logs at all, the function might not be getting called

**Possible reasons:**
- Function name mismatch (should be exactly `send-employee-credentials`)
- Network/CORS issues
- Error in the `handleMarkAsEmployee` function before it reaches the email sending part

---

## Issue 7: Check Email Spam Folder

Sometimes emails are sent successfully but end up in spam:

1. Check your spam/junk folder
2. Check your email provider's quarantine
3. If found in spam, mark it as "Not Spam" to help future emails

---

## Issue 8: SendGrid Account Status

Check your SendGrid account:

1. Go to https://app.sendgrid.com
2. Check your account status
3. Verify you're not on a trial that has expired
4. Check if there are any account restrictions
5. Look at **Activity** → **Email Activity** to see if emails are being attempted

---

## Quick Fix Checklist

✅ **Secrets are set correctly:**
- `SENDGRID_API_KEY` exists and is valid
- `SENDGRID_FROM_EMAIL` exists (not just `FROM_EMAIL`)

✅ **SendGrid is configured:**
- API key has "Mail Send" permission
- Sender email is verified in SendGrid

✅ **Function is deployed:**
- Function `send-employee-credentials` exists in your Edge Functions list
- Function was deployed successfully (no errors)

✅ **Function is being called:**
- Check logs when marking someone as hired
- Test the function manually using the Invoke tab

✅ **Email delivery:**
- Check spam folder
- Verify recipient email address is correct
- Check SendGrid activity logs

---

## Most Common Fix

**90% of the time, the issue is:**
1. Missing or incorrectly named `SENDGRID_FROM_EMAIL` secret
2. SendGrid sender email not verified
3. SendGrid API key doesn't have proper permissions

Fix these three things first, then test again!

