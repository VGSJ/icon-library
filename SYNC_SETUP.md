# Automated Daily Icon Sync Setup Guide

## Overview
Daily automated sync runs at **9am SGT** to:
- ✅ Auto-remove icons no longer in Figma
- ✅ Auto-add new icons from Figma
- ⚠️ Flag new categories for manual approval (creates PR)

---

## Setup Instructions

### Step 1: Add GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

#### `FIGMA_TOKEN` (Required)
1. Open Figma
2. Go to **Account Settings → Personal access tokens**
3. Create new token with scope: `file_read`
4. Copy token
5. Paste in GitHub secret

#### `SLACK_WEBHOOK_URL` (Optional - for notifications)
1. Create Slack bot (go to `api.slack.com`)
2. Enable Incoming Webhooks
3. Create webhook for #icon-library channel
4. Copy webhook URL
5. Paste in GitHub secret (or skip if don't need Slack)

### Step 2: Verify Workflow File
Check that `.github/workflows/sync-icons-daily.yml` exists (it's already created).

### Step 3: Test the Workflow
```bash
# Manual trigger via GitHub CLI
gh workflow run sync-icons-daily.yml

# Or go to: Actions → Daily Icon Sync from Figma → Run workflow
```

---

## How It Works

### Automatic (No Action Needed)
1. **9am SGT daily** (1am UTC) - workflow runs
2. **Detects changes** - compares Figma vs site icons
3. **Removes deleted icons** - auto-deletes SVG files no longer in Figma
4. **Adds new icons** - auto-syncs new icons by category
5. **Updates metadata** - regenerates icons.json
6. **Auto-commits** - pushes changes to `main` branch

**No manual work** - all changes applied automatically.

### Manual Approval (New Categories Only)
1. **New category detected** - workflow creates draft PR
2. **PR title** - "⚠️ New Icon Categories Found - Manual Review Required"
3. **Review in GitHub** - check `sync-report.md` for details
4. **Approve & merge** - or request changes
5. **Categories added** - to site after PR merge

---

## Monitoring

### Check Sync Status
1. Go to **Actions** tab in GitHub
2. Click **Daily Icon Sync from Figma**
3. View latest run
4. Check logs for added/removed/errors

### Sync Report
After each run, `sync-report.md` shows:
- How many icons added
- How many icons removed
- New categories (if any)
- Errors (if any)

### Slack Notifications (Optional)
If `SLACK_WEBHOOK_URL` set, get daily notifications in #icon-library:
```
Icon sync completed ✅
- Added: 5 icons
- Removed: 2 icons
- New categories: 1 (needs approval)
```

---

## Manual Trigger

Can manually run sync anytime:

**Via GitHub CLI:**
```bash
gh workflow run sync-icons-daily.yml
```

**Via GitHub UI:**
1. Actions → Daily Icon Sync from Figma
2. Click "Run workflow" → Run workflow

---

## What Gets Auto-Synced

### ✅ Auto Actions
- Remove icons deleted from Figma
- Add new icons from existing categories
- Add new sizes (if icon gets 64/72px variants)
- Update metadata from Figma

### ⚠️ Manual Approval Required
- New categories (creates draft PR)
- Category renames/reorganizations
- Major icon library changes

---

## Troubleshooting

### "FIGMA_TOKEN not found"
- Add `FIGMA_TOKEN` to GitHub Secrets
- Restart workflow

### "No new icons found but expecting some"
- Check Figma component names match expected format
- Verify FIGMA_TOKEN has `file_read` permission
- Check Figma file ID in environment

### "Workflow didn't run at scheduled time"
- GitHub Actions can have delays (up to 15 minutes)
- Manually trigger via UI if urgent
- Check GitHub status page

### "Too many icons in one sync"
- Batches run in 50-icon chunks (auto-managed)
- Should complete within 30-minute timeout
- Check logs for bottleneck

---

## Customization

### Change Sync Time
Edit `.github/workflows/sync-icons-daily.yml`:
```yaml
on:
  schedule:
    - cron: '0 1 * * *'  # Change these numbers
```

Cron format: `minute hour day month day-of-week`
- Current: `0 1 * * *` = 1am UTC (9am SGT)
- Examples:
  - `0 8 * * *` = 8am UTC (4pm SGT)
  - `0 22 * * *` = 10pm UTC (6am next day SGT)
  - `30 1 * * 1` = 1:30am UTC, Mondays only

### Disable Auto-Sync
Comment out the `schedule` section in workflow file or delete the file.

### Add to Slack
Set `SLACK_WEBHOOK_URL` secret and uncomment Slack step in workflow.

---

## Current Status

✅ **Workflow configured:** `.github/workflows/sync-icons-daily.yml`
✅ **Scripts created:**
- `scripts/detect-icon-changes.mjs` - identifies changes
- `scripts/auto-remove-icons.mjs` - removes deleted icons
- `scripts/auto-add-icons.mjs` - adds new icons

⏳ **Pending:** Add `FIGMA_TOKEN` to GitHub Secrets

---

## Next Steps

1. **Get Figma token** from Figma Settings
2. **Add `FIGMA_TOKEN` secret** to GitHub
3. **Test workflow** via Actions UI or CLI
4. **Monitor first run** to ensure no errors
5. **Set up Slack** (optional) for notifications

---

## Questions?

See `RULES.md` for overall workflow and `PRODUCT_REQUIREMENTS.md` for feature details.
