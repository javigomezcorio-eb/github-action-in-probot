# Manual Setup for Local Development

If you prefer to set up the GitHub App manually instead of using Probot's automatic setup:

## Step 1: Create a Smee.io Channel

1. Visit https://smee.io
2. Click "Start a new channel"
3. Copy the webhook proxy URL (e.g., `https://smee.io/abc123xyz`)

## Step 2: Create a GitHub App Manually

1. Go to: https://github.com/settings/apps/new
2. Fill in:
   - **GitHub App name**: `Policy Enforcement Bot DEV` (must be globally unique)
   - **Homepage URL**: `https://example.com`
   - **Webhook URL**: Your Smee.io URL from Step 1
   - **Webhook secret**: Generate a random string (save it)
     ```bash
     # Generate a webhook secret
     openssl rand -hex 32
     ```

3. Set **Permissions** (Repository permissions):
   - Actions: **Read & write**
   - Checks: **Read & write**  
   - Contents: **Read only**
   - Commit statuses: **Read & write**

4. Subscribe to **Events**:
   - ✅ Workflow run

5. **Where can this GitHub App be installed?**
   - Select "Only on this account"

6. Click **Create GitHub App**

7. **Generate a private key**:
   - On the app settings page, scroll down
   - Click "Generate a private key"
   - Save the downloaded `.pem` file to your project directory

8. **Note your App ID**:
   - Found at the top of the app settings page

## Step 3: Install the App on Your Repository

1. From your app settings page, click "Install App" in the left sidebar
2. Select your GitHub account
3. Choose "Only select repositories"
4. Select your `github-action-in-probot` repository
5. Click "Install"

## Step 4: Create .env File

Create a `.env` file in your project root:

```bash
# Your GitHub App ID from Step 2.8
APP_ID=123456

# Path to your private key OR the key content
PRIVATE_KEY_PATH=./your-app-name.2024-02-18.private-key.pem
# OR paste the key content (keep quotes and line breaks):
# PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
# MIIEpAIBAAKCAQEA...
# ...
# -----END RSA PRIVATE KEY-----"

# The webhook secret from Step 2.2
WEBHOOK_SECRET=your_webhook_secret_here

# Your Smee.io URL from Step 1
WEBHOOK_PROXY_URL=https://smee.io/abc123xyz

# Optional settings
LOG_LEVEL=debug
FREEZE_MODE=true
```

## Step 5: Install Smee Client (Optional)

If you want to run the Smee proxy manually:

```bash
npm install -g smee-client

# Run it
smee --url https://smee.io/abc123xyz --target http://localhost:3000/api/github/webhooks
```

But Probot usually handles this automatically when WEBHOOK_PROXY_URL is set.

## Step 6: Start Your App

```bash
npm run dev
```

You should see:
```
INFO (probot): Listening on http://localhost:3000
INFO (probot): Connected to GitHub App: Policy Enforcement Bot DEV
```

## Step 7: Test It

1. Push a commit to your repository
2. Watch your terminal for webhook events
3. Check GitHub Actions - the workflow should be cancelled
4. Check the commit for a comment from your bot

## Troubleshooting

### "SmeeClient is not available"
- Install smee-client: `npm install --save-dev smee-client`
- Or set WEBHOOK_PROXY_URL in .env

### "Resource not accessible by integration"
- Check app permissions in GitHub App settings
- Ensure app is installed on the repository
- Verify permissions match app.yml

### Webhooks not received
- Check Smee.io dashboard for incoming webhooks
- Verify WEBHOOK_PROXY_URL in .env
- Check webhook deliveries in GitHub App settings

### Private key errors
- Ensure line breaks are preserved
- Use PRIVATE_KEY_PATH if pasting the key is problematic
- Check file permissions on .pem file
