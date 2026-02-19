# GitHub Actions Policy Enforcement App

A Probot app that enforces GitHub Actions policies by cancelling workflow runs during production incident freezes.

## 🎯 What it does

This app monitors `workflow_run` events and automatically:
- ✅ Cancels workflow runs when freeze mode is enabled
- 💬 Posts a comment on the commit explaining why the workflow was cancelled
- 📊 Logs all actions for audit purposes

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the GitHub App:
   ```bash
   npm run dev
   ```
   Follow the prompts to create your GitHub App.

3. Configure environment variables in `.env`:
   ```env
   FREEZE_MODE=true
   LOG_LEVEL=debug
   ```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📚 Documentation

See [SETUP.md](./SETUP.md) for detailed setup and deployment instructions.

## 🎮 Demo

This repo includes a demo workflow (`.github/workflows/demo.yml`) that you can use to test the enforcement:

1. Make sure the Probot app is running locally (`npm run dev`)
2. Edit this README file (add a line below)
3. Commit and push the changes
4. Watch the GitHub Actions tab - the workflow will be cancelled!
5. Check the commit for a comment from the bot

---

### Test Area - Edit Below to Trigger Workflow

- Demo test 1
- Add your test lines here...

---

## 🔧 How it works

1. GitHub sends `workflow_run` webhook events to the app
2. The app checks if freeze mode is enabled (`FREEZE_MODE=true`)
3. If enabled, the app cancels the workflow run via GitHub API
4. A comment is posted on the commit explaining the cancellation

## 📝 License

MIT

Test to fail a pull push
