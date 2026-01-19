# Known Issues & Maintenance Notes

## Current Status
**Date:** January 19, 2026  
**Icon Library:** 1,176 icons across 28 categories  
**Completeness:** 10,870 / 10,875 variants (99.95%)  

## Known Issues

### 1. Incomplete Icon: NFC
- **Icon Name:** nfc
- **Category:** system & technology  
- **Status:** 5/10 variants missing (16, 24, 32, 40, 48)
- **Available:** filled-16, filled-24, filled-32, filled-40, filled-48
- **Missing:** outline versions in all sizes
- **Action:** Not critical - icon is usable in filled style
- **TODO:** Download outline variants from Figma or mark as filled-only

## How to Fix Incomplete Icons

### Option 1: Download Missing Variants
```bash
# Sync the category that contains the incomplete icon
node scripts/sync-category.mjs "system & technology"
```

### Option 2: Remove from Metadata
If icon is intentionally incomplete, edit `metadata-corrections.json` and regenerate:
```bash
node generate-metadata.mjs
```

### Option 3: Manual Download
1. Open Figma
2. Find "icon-nfc" component
3. Download missing outline variants (16, 24, 32, 40, 48)
4. Place in `docs/raw-svg/outline/{size}/`
5. Run `node generate-metadata.mjs`

## Maintenance Checklist

### Daily Sync (9am SGT)
- ✅ Runs automatically via GitHub Actions
- ✅ Syncs all 28 categories
- ✅ Detects and downloads changed SVGs via timestamp comparison
- ✅ Regenerates metadata automatically
- ✅ Commits and deploys to GitHub Pages

### Weekly
- [ ] Check GitHub Actions logs for sync failures
- [ ] Review sync reports for any errors
- [ ] Verify completeness: `node scripts/validate-svgs.mjs`

### Monthly
- [ ] Check for performance regressions
- [ ] Review and update metadata corrections if needed
- [ ] Verify icon library is accessible and loading correctly

### As Needed
- [ ] Manual category sync: `node scripts/sync-category.mjs "category"`
- [ ] Full re-sync: `node scripts/sync-all-categories.mjs`
- [ ] Validate all icons: `node scripts/validate-svgs.mjs`

## Troubleshooting

### Sync Fails with "Invalid category"
**Solution:** Use exact category names from list
```bash
node scripts/sync-category.mjs "heating ventilation air conditioning"  # ✓ correct
node scripts/sync-category.mjs "hvac"  # ✗ won't work
```

### Missing FIGMA_TOKEN error
**Solution:** Ensure `.env` file has credentials
```
FIGMA_TOKEN=xxxxx
FIGMA_FILE_KEY=xxxxx
```

### Metadata generation times out
**Solution:** The script has a 2-minute timeout. If it exceeds, check:
- File system performance
- Number of files in docs/raw-svg/ (currently 10,875 files)
- Available disk space

### Network timeouts during sync
**Solution:** Script now retries failed downloads with exponential backoff
- Up to 2 retries per failed batch
- Automatically handles rate limiting (HTTP 429)
- Can be run again to retry from where it failed

## Statistics

| Metric | Value |
|--------|-------|
| Total Icons | 1,176 |
| Total Variants | 10,875 |
| Categories | 28 |
| Styles | 2 (outline, filled) |
| Sizes | 5 (16, 24, 32, 40, 48px) |
| Completeness | 99.95% (10,870/10,875) |

## Performance

| Operation | Time |
|-----------|------|
| Full 28-category sync | ~240s |
| Metadata generation | ~10s |
| Validation check | ~5s |
| Single category sync | ~10-30s |

## Future Improvements

1. **Download missing NFC outline variants** - Currently at 50% completion
2. **Add unit tests** - For retry logic and validation
3. **Performance optimization** - Parallel category syncing
4. **Metrics collection** - Track sync times, success rates
5. **Auto-fixing** - Automatically retry failed syncs

## Support

For issues or questions:
1. Check EXPERT_REVIEW_SUMMARY.md for architecture overview
2. Check ROBUSTNESS_REVIEW.md for implementation details
3. Review sync output logs for specific errors
4. Check GitHub Actions workflow logs for automated sync results
