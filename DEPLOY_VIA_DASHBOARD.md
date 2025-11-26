# Deploy Edge Function via Supabase Dashboard (Web Interface)

If you prefer to use the Supabase web dashboard instead of the CLI, follow these steps:

## Step 1: Access Edge Functions in Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. In the left sidebar, click on **Edge Functions** (under "Project Settings" or in the main navigation)

## Step 2: Create New Function

1. Click the **"Create a new function"** or **"New Function"** button
2. You'll see a code editor interface

## Step 3: Set Function Name

1. In the function name field, enter: `send-employee-credentials`
2. Make sure the name matches exactly (it's case-sensitive)

## Step 4: Copy the Function Code

1. Open the file `supabase/functions/send-employee-credentials/index.ts` from your project
2. Copy **ALL** the code from that file
3. Paste it into the code editor in the Supabase dashboard

## Step 5: Deploy the Function

1. Click the **"Deploy"** button (usually at the top right or bottom of the editor)
2. Wait for the deployment to complete
3. You should see a success message

## Step 6: Set Environment Variables (Secrets)

1. In the Edge Functions section, look for **"Settings"** or **"Secrets"** tab
2. Click on it
3. Add the following secrets:

   **Secret 1:**
   - **Name:** `SENDGRID_API_KEY`
   - **Value:** Your SendGrid API key (get it from your SendGrid account)
   - Click **"Add Secret"** or **"Save"**

   **Secret 2:**
   - **Name:** `SENDGRID_FROM_EMAIL`
   - **Value:** Your sender email address (e.g., `noreply@roadwise.com`)
   - Click **"Add Secret"** or **"Save"**

## Step 7: Verify Deployment

1. Go back to the Edge Functions list
2. You should see `send-employee-credentials` in your list of functions
3. Click on it to view details

## Step 8: Test the Function (Optional)

1. Click on the `send-employee-credentials` function
2. Look for an **"Invoke"** or **"Test"** tab
3. Use this sample JSON to test:
   ```json
   {
     "toEmail": "your-test-email@example.com",
     "employeeEmail": "ladalem@roadwise.com",
     "employeePassword": "LAdalem19900101!",
     "firstName": "Lorenz",
     "lastName": "Adalem",
     "fullName": "Lorenz Vincel A. Adalem"
   }
   ```
4. Click **"Invoke"** or **"Run"**
5. Check your test email to see if the email was sent

## Alternative: Upload Function Files

Some Supabase dashboards allow you to upload function files directly:

1. In Edge Functions, look for an **"Upload"** or **"Import"** option
2. If available, you can:
   - Upload the entire `send-employee-credentials` folder
   - Or zip the folder and upload the zip file

## Getting Your SendGrid API Key

If you don't have a SendGrid API key yet:

1. Go to https://app.sendgrid.com
2. Log in to your SendGrid account
3. Go to **Settings** → **API Keys**
4. Click **"Create API Key"**
5. Give it a name (e.g., "Supabase Edge Functions")
6. Select **"Full Access"** or **"Restricted Access"** with "Mail Send" permissions
7. Click **"Create & View"**
8. **Copy the API key immediately** (you won't be able to see it again)
9. Paste it as the `SENDGRID_API_KEY` secret in Supabase

## Troubleshooting

### Function not appearing
- Make sure you clicked "Deploy" after pasting the code
- Refresh the page and check again
- Verify the function name is exactly `send-employee-credentials`

### Email not sending
- Check that both secrets (`SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`) are set correctly
- Verify your SendGrid API key is valid and has "Mail Send" permissions
- Check the function logs in the dashboard for error messages
- Make sure your SendGrid account is verified and not in trial mode (if applicable)

### Can't find Edge Functions section
- Make sure you're on a paid plan (Edge Functions require a paid Supabase plan)
- Check if Edge Functions are enabled for your project
- Try refreshing the dashboard

## Notes

- The function code must be exactly as provided in `supabase/functions/send-employee-credentials/index.ts`
- Make sure to set the secrets **after** deploying the function
- The function will be automatically called when you mark an applicant as hired in your HR Recruitment dashboard

