# Local Development and Testing Guide

This guide will help you run your Probot app locally and test it with a real GitHub repository.

## Prerequisites

- Node.js >= 18 (you have v20.11.1)
- A GitHub account
- A test repository where you can trigger workflows

## Step 1: Create a GitHub App

You need to register your Probot app with GitHub:

### Option A: Automatic Registration (Recommended)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. When prompted, Probot will guide you through creating a GitHub App automatically:
   - It will open a browser window
   - You'll be asked to name your app (e.g., "Policy Enforcement Bot DEV")
   - Accept the default permissions (they match your `app.yml`)
   - Choose which account to install it on (your personal account or an org)
   
3. Probot will automatically create a `.env` file with your credentials

### Option B: Manual Registration

1. Go to GitHub Settings:
   - Personal account: https://github.com/settings/apps/new
   - Organization: https://github.com/organizations/YOUR_ORG/settings/apps/new

2. Fill in the form:
   - **GitHub App name**: `Policy Enforcement Bot DEV` (must be unique)
   - **Homepage URL**: `https://example.com` (or your URL)
   - **Webhook URL**: `https://smee.io/NEW_CHANNEL` (get from smee.io - see below)
   - **Webhook secret**: Generate a random string (save for later)
   
3. Set permissions (matching `app.yml`):
   - Repository permissions:
     - Actions: Read & write
     - Checks: Read & write
     - Contents: Read
     - Commit statuses: Read & write
   
4. Subscribe to events:
   - ✅ Workflow run
   
5. Create the app and generate a private key:
   - Click "Generate a private key" button
   - Save the downloaded `.pem` file
   
6. Note your App ID (shown at the top of the settings page)

7. Install the app on your test repository:
   - Go to the app's page → Install App
   - Select your test repository

## Step 2: Set Up Webhook Forwarding (for local development)

Since GitHub needs to send webhooks to your local machine, use **Smee.io**:

1. Visit https://smee.io and click "Start a new channel"
2. Copy the webhook proxy URL (e.g., `https://smee.io/abc123`)
3. Use this URL as your GitHub App's webhook URL

## Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from example
cp .env.example .env
```

Edit `.env` with your values:

```env
# From your GitHub App settings page
APP_ID=123456

# Content of the .pem file you downloaded (keep the line breaks)
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----"

# The webhook secret you created
WEBHOOK_SECRET=your_webhook_secret_here

# Optional: Set log level (debug for more details)
LOG_LEVEL=debug

# Optional: Enable freeze mode (already in .env.example)
FREEZE_MODE=true

# If using smee.io for webhook forwarding
WEBHOOK_PROXY_URL=https://smee.io/YOUR_CHANNEL
```

**Tips for PRIVATE_KEY:**
- Keep the quotes around the entire key
- Preserve all line breaks
- Or use the path: `PRIVATE_KEY_PATH=./path-to-your-key.pem`

## Step 4: Run Locally

```bash
# Start the development server
npm run dev
```

You should see output like:
```
INFO (probot): Listening on http://localhost:3000
INFO (probot): Connected to GitHub App: Policy Enforcement Bot DEV
```

## Step 5: Test with a Real Repository

### Setup Your Test Repository

1. **Choose or create a test repository** where you'll install the app
   
2. **Ensure the app is installed** on that repository:
   - Go to https://github.com/settings/installations
   - Click "Configure" next to your app
   - Select the test repository

3. **Create a workflow file** in `.github/workflows/test.yml`:

```yaml
name: Test Workflow
on:
  push:
    branches: [main, master]
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run test
        run: echo "Testing policy enforcement"
      - name: Wait a bit
        run: sleep 10
```

### Trigger the Workflow

With your Probot app running locally (`npm run dev`), trigger a workflow:

**Option 1: Push a commit**
```bash
# In your test repository
git commit --allow-empty -m "Test policy enforcement"
git push
```

**Option 2: Use workflow_dispatch** (from GitHub UI)
- Go to Actions tab → Select "Test Workflow" → Click "Run workflow"

**Option 3: Create a Pull Request**

### What to Expect

1. **In your Probot app terminal**, you should see:
   ```
   INFO (probot): workflow_run event received
   INFO (probot): workflow run cancelled
   INFO (probot): cancellation comment posted
   ```

2. **In GitHub**, check:
   - The workflow run should be **cancelled** (yellow/cancelled status)
   - A **comment should appear** on the commit explaining why it was cancelled
   - Go to: `https://github.com/OWNER/REPO/actions`

## Step 6: Debugging

### Enable Debug Logging

Set in your `.env`:
```env
LOG_LEVEL=debug
```

This will show detailed information about:
- Incoming webhook events
- Policy decisions
- API calls to GitHub

### Check Webhook Deliveries

1. Go to your GitHub App settings:
   - https://github.com/settings/apps/YOUR_APP_NAME
   
2. Click "Advanced" → "Recent Deliveries"

3. You can see:
   - All webhook events sent to your app
   - Request/response payloads
   - Redeliver failed events for testing

### Common Issues

**Issue: Webhooks not received**
- Check smee.io is running
- Verify WEBHOOK_PROXY_URL in .env
- Check GitHub App webhook URL matches smee.io channel

**Issue: "Resource not accessible by integration"**
- Check app permissions in GitHub App settings
- Ensure app is installed on the repository
- Verify the app has `actions: write` permission

**Issue: Workflow not cancelled**
- Check FREEZE_MODE=true in .env
- Look at logs for policy decision reason
- Verify workflow_run events are being received

## Step 7: Deploy to Production (Optional)

Once testing locally works, you can deploy:

### Deploy Options:
1. **Vercel/Netlify** - Serverless functions
2. **Heroku** - Simple deployment
3. **AWS Lambda** - Serverless
4. **Your own server** - Docker container

### Environment Setup:
- Set the same environment variables (APP_ID, PRIVATE_KEY, WEBHOOK_SECRET)
- Update webhook URL in GitHub App settings to your production URL
- Build the app: `npm run build`
- Start: `npm start`

## Testing the Policy Logic

Your app cancels workflows when `FREEZE_MODE=true`. To test different scenarios:

### Test Case 1: Freeze Mode Enabled (Default)
```env
FREEZE_MODE=true
```
- All workflow runs should be cancelled
- Comment should be posted on commit

### Test Case 2: Freeze Mode Disabled
```env
FREEZE_MODE=false
```
- Workflows should run normally
- No cancellation or comments

### Test Case 3: Multiple Runs
- Push multiple commits rapidly
- Each workflow should be cancelled
- Only one cancellation per run (handled by HANDLED_RUNS set)

## Monitoring

Watch the logs in real-time:
```bash
npm run dev
```

Check for these log entries:
- `workflow_run event received` - Event received
- `workflow run cancelled` - Successfully cancelled
- `cancellation comment posted` - Comment added
- `workflow run skipped` - Policy decided not to cancel

## Tips

1. **Use a dedicated test repository** - Don't test on important projects
2. **Keep your .env file secure** - Never commit it (already in .gitignore)
3. **Use debug logging during development** - Set LOG_LEVEL=debug
4. **Test with different workflow triggers** - push, pull_request, workflow_dispatch
5. **Monitor GitHub rate limits** - Probot handles this automatically

## Next Steps

Once you've verified the app works locally:
1. Test all edge cases (permission errors, already cancelled runs, etc.)
2. Run the test suite: `npm test`
3. Consider adding more policies to `policy.ts`
4. Deploy to a hosting platform
5. Update webhook URL to production URL
6. Monitor production logs

## Resources

- Probot Documentation: https://probot.github.io/
- GitHub Apps API: https://docs.github.com/en/rest/apps
- Smee.io webhook proxy: https://smee.io
