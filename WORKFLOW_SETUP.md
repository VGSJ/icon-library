# GitHub Actions Workflow Setup

## Current Status

The daily icon sync workflow has been configured to run automatically at **9am SGT (1am UTC)** every day.

## Required GitHub Secrets

Before the workflow can run successfully, add these secrets to your GitHub repository:

### 1. FIGMA_TOKEN (already added ✅)
- **Type:** Personal Access Token from Figma
- **Status:** ✅ Already configured

### 2. FIGMA_FILE_KEY (needs to be added ⚠️)
- **Type:** Figma file ID
- **Value:** `EOg08nH8vap01HgPoJBQws`
- **Location:** Settings → Secrets and variables → Actions
- **Status:** ⚠️ **PENDING** - Add this secret for workflow to work

### 3. SLACK_WEBHOOK_URL (optional)
- **Type:** Slack webhook URL for notifications
- **Status:** Optional - Skip if you don't want Slack notifications

## How to Add FIGMA_FILE_KEY Secret

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the following:
   - **Name:** `FIGMA_FILE_KEY`
   - **Value:** `EOg08nH8vap01HgPoJBQws`
5. Click **Add secret**

## Workflow Behavior

The daily sync workflow (`sync-icons-daily.yml`) performs these steps:

1. **Detect Changes** - Compares Figma metadata against local library
   - Added icons (new in Figma)
   - Removed icons (deleted from Figma)
   - Metadata changes (tags, aliases, categories updated)
   - New categories

2. **Auto-sync** - Automatically adds/removes icons
   - Removes deleted icons from library
   - Downloads new icons from Figma
   - Updates metadata from Figma

3. **Commit & Push** - Auto-commits changes if any
   - Message: `chore: auto sync icons from Figma [skip ci]`
   - Only commits if changes detected

4. **Create PR** - For new categories (optional)
   - Creates draft PR for manual review
   - Requires approval before merging

## Manual Trigger

To test the workflow manually:

1. Go to **Actions** tab in GitHub
2. Select **Daily Icon Sync from Figma**
3. Click **Run workflow** → **Run workflow**

## Troubleshooting

### Workflow fails with "FIGMA_FILE_KEY not set"
- Add the secret as described above
- Re-run the workflow

### Workflow fails during metadata generation
- Check that local `docs/metadata/icons.json` exists
- Verify Figma token is still valid

### No icons being synced
- Run detection script manually: `node scripts/detect-icon-changes.mjs`
- Check for metadata changes in output
- Verify Figma file hasn't been archived
