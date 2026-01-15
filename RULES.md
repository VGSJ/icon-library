# icon-library Development Rules

## File Naming & Organization
- SVG filenames: `icon-{name}-{style}-{size}{px_suffix}.svg`
  - **name**: icon identifier (e.g., `escalator-down`, `oxygen-tank`)
  - **style**: `filled` or `outline` (interchangeable with `fill` and `outlined`)
  - **size**: `16`, `24`, `32`, `40`, or `48` (in pixels)
  - **px_suffix**: optional `px` (some icons have it, some don't)
- Directory structure: `raw-svg/{style}/{size}/icon-{name}-{style}-{size}.svg`
- Style name normalization: `fill` → `filled`, `outlined` → `outline` (automatic) 

## Metadata Management
- Keep `docs/metadata/icons.json` in sync with actual SVG files in `docs/raw-svg/`
- Run `node generate-metadata.mjs` to generate fresh `icons.json` from SVG files
- Apply category corrections via `metadata-corrections.json` before regenerating
- Metadata is regenerated automatically after each `sync-category.mjs` run
- **Never manually edit** `docs/metadata/icons.json` (always regenerate instead)

## Current Icon Sync Process
**All icon operations use these scripts in this order:**
- `node scripts/sync-category.mjs {category}` - Download icons by category from Figma
- `node scripts/validate-svgs.mjs` - Validate all SVG variants are present
- `node generate-metadata.mjs` - Generate metadata with all corrections applied
- Edit `metadata-corrections.json` to fix any miscategorizations before regenerating
**Key principle**: Avoid solving singular problems. Consider overall workflow impact.

## Deployment
- Deploy to GitHub Pages automatically after changes
- Hard refresh browser (**Cmd+Shift+R**) to see updates
- Site loads icons from: `./raw-svg/{style}/{size}/icon-{name}-{style}-{size}.svg`
- Always verify on live site before saying that it's live

## Code Changes
- Use absolute file paths when editing
- Combine independent operations in parallel when possible
- Always include 3-5 lines of context before/after changes
- Test locally before pushing: `npm run dev`
- Update related files together (e.g., workflow + package.json + scripts)
- Keep repository optimized and efficient

## File Modifications
- **DO NOT** modify `.env` file (contains Figma credentials)
- **DO NOT** manually edit `metadata/icons.json` - regenerate instead
- **DO NOT** create documentation files unless explicitly asked

## Commit Messages
- Use format: `"chore: {action}"` or `"Fix {issue}"`
- Example: `"chore: sync icons from Figma"`

## Site Structure
- `docs/` folder is deployed to GitHub Pages (GitHub's default)
- Must contain: `app.js`, `index.html`, `styles.css`, `raw-svg/`, `metadata/`
- App loads icons dynamically from `app.js`
- **Note**: Single-source architecture (no site/ folder - consolidated to docs/)

## Current Status
- **Live site**: https://vgsj.github.io/icon-library/
- **Displayed icons**: 488 across 14 categories
- **Available in Figma**: 1,110+ icon component sets with 11,059 total variants
- **Sync method**: Figma API category-based downloads (sync-category.mjs)

## Icon Import/Update/Check Workflow
**This is the exact workflow to follow for any icon operation. Do not deviate.**

### 1. Download Icons by Category
```bash
node scripts/sync-category.mjs {category-name}
```
- Replace `{category-name}` with actual category (e.g., `editor`, `arrows`, `actions & general interface`)
- Downloads all SVG variants for that category from Figma
- Batch downloads ~50 icons at a time
- **Automatically regenerates metadata after download completes**
- **Result**: New icons appear in `docs/raw-svg/{style}/{size}/` folders

### 2. Validate SVG Variants
```bash
node scripts/validate-svgs.mjs
```
- Confirms all icon variants are present (16, 24, 32, 40, 48px for both styles)
- Identifies missing variants
- **Result**: Confirms sync integrity before proceeding

### 3. Check Figma Metadata vs Local
```bash
jq '.icons[] | select(.name == "{icon-name}") | {name, category, tags}' docs/metadata/icons.json
```
- Replace `{icon-name}` with specific icon to verify
- Checks current local category assignment
- Compares with Figma source if needed
- **Result**: Identifies miscategorized or missing category info

### 4. Add Metadata Corrections (If Needed)
- Edit `metadata-corrections.json` to fix any miscategorizations
- Format:
```json
{
  "{icon-name}": {
    "category": "correct category name",
    "tags": ["tag1", "tag2"]
  }
}
```
- Example: `office-buildings` → `building & construction`
- **Result**: Correction stored for reapplication

### 5. Regenerate Metadata with Corrections
```bash
node generate-metadata.mjs
```
- Reads `docs/raw-svg/` and applies all corrections from `metadata-corrections.json`
- Generates fresh `docs/metadata/icons.json` with corrections applied
- Normalizes category labels to lowercase
- **Result**: All corrections active in metadata

### 6. Commit and Deploy
```bash
git add metadata-corrections.json docs/metadata/icons.json docs/raw-svg/
git commit -m "feat: add {count} {category} icons from Figma

- Downloaded {count} icons with {variant-count} SVG variants
- Added to {category} category
- All {count} icons now available" 
git push
```
- Only commit files that changed
- Commit triggers automatic GitHub Pages deployment
- **Result**: Icons live on production within seconds

### 7. Verify Live Site
- Open https://vgsj.github.io/icon-library/
- Hard refresh (**Cmd+Shift+R** on macOS, **Ctrl+Shift+R** on Windows/Linux)
- New category appears in sidebar
- New icons display in grid
- Details panel shows correct metadata
- **Result**: Verification complete

### Quick Reference Table
| Step | Command | Purpose |
|------|---------|----------|
| 1 | `node scripts/sync-category.mjs {category}` | Download icons by category |
| 2 | `node scripts/validate-svgs.mjs` | Validate all variants exist |
| 3 | `jq '.icons[] \| select(.name == "{name}")' docs/metadata/icons.json` | Check icon metadata |
| 4 | Edit `metadata-corrections.json` | Fix miscategorizations |
| 5 | `node generate-metadata.mjs` | Apply all corrections |
| 6 | `git add ... && git commit && git push` | Deploy to GitHub Pages |
| 7 | Browser: https://vgsj.github.io/icon-library/ + hard refresh | Verify live |

### Important Notes
- **Always run validate-svgs.mjs** after sync to ensure integrity
- **metadata-corrections.json is the source of truth** for category overrides
- **generate-metadata.mjs MUST be run after corrections** to apply them
- **Never manually edit docs/metadata/icons.json** (regenerate instead)
- GitHub Pages updates within seconds of push
- Always hard refresh browser to see new changes

## Common Tasks
- **Add new category icons**: `sync-category.mjs {category}` → `validate-svgs.mjs` → `generate-metadata.mjs` → commit → push → verify
- **Fix miscategorization**: add to `metadata-corrections.json` → `generate-metadata.mjs` → commit → push
- **Check icon metadata**: `jq '.icons[] | select(.name == "{name}")'  docs/metadata/icons.json`
- **Debug**: Check browser console for 404 errors on missing SVGs
