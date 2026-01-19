# Script Cleanup Analysis - January 19, 2026

## Scripts Currently in Repository

### Active Scripts (Being Used)
1. ✅ **scripts/sync-category.mjs** - Primary sync script, used daily
2. ✅ **scripts/sync-all-categories.mjs** - Syncs all 28 categories, used daily
3. ✅ **scripts/validate-svgs.mjs** - Validates icon completeness
4. ✅ **scripts/list-category.mjs** - Lists icons in a category
5. ✅ **generate-metadata.mjs** - Generates metadata from SVGs
6. ✅ **scripts/detect-icon-changes.mjs** - Used in GitHub Actions workflow (generates report)

### Deprecated Scripts (Not Used)
1. ❌ **scripts/auto-remove-icons.mjs** - Placeholder, never implemented
2. ❌ **scripts/auto-add-icons.mjs** - Placeholder, never implemented
3. ❌ **detect-svg-changes.mjs** - Abandoned hash-based detection (superseded by timestamp approach)
4. ❌ **check-uncategorized.mjs** - One-off utility, no longer needed

## Analysis

### scripts/auto-remove-icons.mjs
**Status:** DEPRECATED - Safe to delete

**Evidence:**
- Contains TODO comment: "TODO: Compare with Figma component list"
- Just a placeholder that prints "No icons to remove"
- Never called in workflow or code
- Functionality is now built into sync-category.mjs with `cleanupCategory()`

**Recommendation:** DELETE

---

### scripts/auto-add-icons.mjs
**Status:** DEPRECATED - Safe to delete

**Evidence:**
- Contains TODO comment: "TODO: Fetch all Figma components and identify new ones"
- Just a placeholder, always outputs "No new icons to add"
- Never called in workflow or code
- Functionality is now handled by sync-category.mjs (detects new SVGs automatically)

**Recommendation:** DELETE

---

### detect-svg-changes.mjs
**Status:** DEPRECATED - Safe to delete

**Evidence:**
- Implements hash-based SVG change detection using crypto/MD5
- This approach was abandoned in favor of timestamp-based detection
- Last commit: "refactor: remove hash comparison approach for simpler, faster sync"
- Not used anywhere in workflow
- Timestamp comparison in sync-category.mjs is much faster and more reliable

**Recommendation:** DELETE

---

### check-uncategorized.mjs
**Status:** DEPRECATED - Safe to delete

**Evidence:**
- One-off utility script to find uncategorized icons
- No longer needed since we use keyword-based heuristics in generate-metadata.mjs
- Not integrated into workflow
- Simple query that could be done manually if needed

**Recommendation:** DELETE

---

### scripts/detect-icon-changes.mjs
**Status:** ACTIVE - Keep, but consider reducing scope

**Current Usage:** Called in GitHub Actions workflow to generate sync-report.md

**Analysis:**
- Still used in workflow (line 31 of .github/workflows/sync-icons-daily.yml)
- Generates markdown report of added/removed/changed icons
- However, this report is no longer meaningful because:
  1. sync-category.mjs now detects and reports changes per category
  2. Full change detection happens during sync, not as a separate step
  3. Workflow calls this BEFORE syncing, so report is based on outdated metadata

**Options:**
1. **Keep as-is** - Generates pre-sync report (somewhat redundant)
2. **Simplify** - Remove this step, let sync-category.mjs output be the report
3. **Enhance** - Make it generate post-sync report (would need refactoring)

**Recommendation:** SIMPLIFY - Remove from workflow, let sync output be the report

---

## Summary Table

| Script | Status | Used | Safe to Delete |
|--------|--------|------|-----------------|
| sync-category.mjs | ✅ Active | Daily | NO |
| sync-all-categories.mjs | ✅ Active | Daily | NO |
| validate-svgs.mjs | ✅ Active | Manual | NO |
| list-category.mjs | ✅ Active | Manual | NO |
| generate-metadata.mjs | ✅ Active | Daily | NO |
| detect-icon-changes.mjs | ⚠️ Active but redundant | Workflow | Consider removing |
| auto-remove-icons.mjs | ❌ Deprecated | Never | YES - Safe to delete |
| auto-add-icons.mjs | ❌ Deprecated | Never | YES - Safe to delete |
| detect-svg-changes.mjs | ❌ Deprecated | Never | YES - Safe to delete |
| check-uncategorized.mjs | ❌ Deprecated | Never | YES - Safe to delete |

---

## Cleanup Action Plan

### Immediate (Safe, No Risk)
Delete 4 unused placeholder scripts:
```bash
rm scripts/auto-remove-icons.mjs
rm scripts/auto-add-icons.mjs
rm detect-svg-changes.mjs
rm check-uncategorized.mjs
```

### Optional (Consider Removing)
Remove `detect-icon-changes.mjs` from workflow since sync-category.mjs now provides better per-category reporting.

Before and After:
```yaml
# BEFORE
- name: Detect icon changes from Figma
  run: node scripts/detect-icon-changes.mjs > sync-report.md

- name: Sync all categories
  run: node scripts/sync-all-categories.mjs

# AFTER
- name: Sync all categories (includes change detection)
  run: node scripts/sync-all-categories.mjs
```

---

## Files That Reference Deleted Scripts

These documentation files reference the deprecated scripts and should be updated:
1. **SYNC_SETUP.md** - Lines 173-175 mention auto-remove and auto-add
2. **WORKFLOW_SETUP.md** - Line 77 mentions detect-icon-changes.mjs

**These docs should be updated to reflect current workflow.**

---

## What Happens When Scripts Are Deleted

✅ **No impact on functionality** - All deprecated scripts are placeholders
✅ **No impact on workflow** - None are critical to daily sync
✅ **Cleaner codebase** - Removes ~400 lines of dead code
✅ **Easier maintenance** - Fewer files to maintain

---

## Recommendation

**Delete all 4 deprecated scripts immediately:**
- auto-remove-icons.mjs
- auto-add-icons.mjs  
- detect-svg-changes.mjs
- check-uncategorized.mjs

**Then optionally:**
- Remove detect-icon-changes.mjs from workflow (redundant reporting)
- Update SYNC_SETUP.md and WORKFLOW_SETUP.md to remove references

This will streamline the codebase and make it clearer which scripts are actually used.
