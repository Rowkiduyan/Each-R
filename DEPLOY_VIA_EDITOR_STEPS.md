# Deploy Edge Function via Supabase Dashboard Editor

## Step-by-Step Instructions

### Step 1: Open the Deploy Menu
1. In your Supabase dashboard, go to **Edge Functions**
2. Click the green **"Deploy a new function"** button (top right)
3. From the dropdown menu, select **"Via Editor"** (the option with `<>` icon that says "Write and deploy in the browser")

### Step 2: Create the Function
1. A new editor window will open
2. In the function name field, enter: **`send-employee-credentials`**
   - Make sure it's exactly this name (case-sensitive, with hyphens)

### Step 3: Copy the Function Code
1. Open the file `supabase/functions/send-employee-credentials/index.ts` from your local project
2. Select **ALL** the code (Ctrl+A or Cmd+A)
3. Copy it (Ctrl+C or Cmd+C)
4. Go back to the Supabase dashboard editor
5. Delete any default/template code in the editor
6. Paste your code (Ctrl+V or Cmd+V)

### Step 4: Deploy
1. Click the **"Deploy"** button (usually at the top right of the editor)
2. Wait for the deployment to complete
3. You should see a success message like "Function deployed successfully"

### Step 5: Set Environment Variables (Secrets)
1. After deployment, go back to the Edge Functions main page
2. Look for a **"Settings"** or **"Secrets"** tab/button (usually near the top)
3. Click on it to open the secrets management page
4. Add the following secrets:

   **Secret 1:**
   - Click **"Add Secret"** or **"New Secret"**
   - **Name:** `SENDGRID_API_KEY`
   - **Value:** Paste your SendGrid API key here
   - Click **"Save"** or **"Add"**

   **Secret 2:**
   - Click **"Add Secret"** again
   - **Name:** `SENDGRID_FROM_EMAIL`
   - **Value:** Your sender email (e.g., `noreply@roadwise.com`)
   - Click **"Save"** or **"Add"**

### Step 6: Verify
1. Go back to the Edge Functions list
2. You should now see `send-employee-credentials` in your list of functions
3. Click on it to view details, logs, and test it

## Quick Reference: Function Name
```
send-employee-credentials
```

## Getting Your SendGrid API Key
1. Go to https://app.sendgrid.com
2. Log in
3. Navigate to **Settings** → **API Keys**
4. Click **"Create API Key"**
5. Name it (e.g., "Supabase Functions")
6. Select **"Full Access"** or **"Restricted Access"** with "Mail Send" permission
7. Click **"Create & View"**
8. **Copy the key immediately** (you can't see it again later)
9. Use this as your `SENDGRID_API_KEY` secret

## Testing the Function
1. Click on `send-employee-credentials` in your functions list
2. Look for an **"Invoke"** or **"Test"** tab
3. Use this sample JSON:
```json
{
  "toEmail": "your-email@example.com",
  "employeeEmail": "ladalem@roadwise.com",
  "employeePassword": "LAdalem19900101!",
  "firstName": "Lorenz",
  "lastName": "Adalem",
  "fullName": "Lorenz Vincel A. Adalem"
}
```
4. Click **"Invoke"** and check your email

## Troubleshooting

**Function not showing up?**
- Make sure you clicked "Deploy" after pasting the code
- Refresh the page
- Check the function name is exactly `send-employee-credentials`

**Email not sending?**
- Verify both secrets are set correctly
- Check your SendGrid API key is valid
- Look at the function logs in the dashboard for errors
- Make sure your SendGrid account is verified

**Can't find the Editor option?**
- Make sure you're on a paid Supabase plan (Edge Functions require Pro plan or higher)
- Try refreshing the page
- Check if Edge Functions are enabled for your project

