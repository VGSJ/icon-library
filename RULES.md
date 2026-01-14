# icon-library Development Rules

## File Naming & Organization
- All icon files **must start with `icon-`** prefix
- Naming format: `icon-{name}-{style}-{size}.svg`
  - Example: `icon-ai-2-stars-outline-16.svg`
  - Styles: `filled`, `outline`
  - Sizes: `16`, `24`, `32`, `40`, `48`
- Organize in folders: `raw-svg/{style}/{size}/`

## Metadata Management
- Keep `metadata/icons.json` in sync with actual SVG files in `raw-svg/`
- Run `npm run icons:sync` to:
  - Organize SVGs from `figma-export/` → `raw-svg/`
  - Generate updated `metadata/icons.json`
- Always copy `raw-svg/` and `metadata/` to `site/` before deploying

## Workflow & Automation
- GitHub Actions runs daily at 9 AM SGT
- Only commits/pushes if there are actual changes (no empty commits)
- Workflow path: `.github/workflows/sync-icons.yml`
- Key scripts:
  - `quick-sync.mjs` - organize SVGs by style/size
  - `generate-metadata.mjs` - create icons.json
  - `npm run icons:sync` - run both scripts

## Deployment
- Deploy to GitHub Pages automatically after changes
- Hard refresh browser (**Cmd+Shift+R**) to see updates
- Site loads icons from: `./raw-svg/{style}/{size}/icon-{name}-{style}-{size}.svg`

## Code Changes
- Use absolute file paths when editing
- Combine independent operations in parallel when possible
- Always include 3-5 lines of context before/after changes
- Test locally before pushing: `npm run dev`
- Update related files together (e.g., workflow + package.json + scripts)

## File Modifications
- **DO NOT** modify `.env` file (contains Figma credentials)
- **DO NOT** manually edit `metadata/icons.json` - regenerate instead
- **DO NOT** create documentation files unless explicitly asked

## Commit Messages
- Use format: `"chore: {action}"` or `"Fix {issue}"`
- Example: `"chore: sync icons from Figma"`

## Site Structure
- `site/` folder is deployed to GitHub Pages
- Must contain: `app.js`, `index.html`, `styles.css`, `raw-svg/`, `metadata/`
- App loads icons dynamically from `app.js`

## Common Tasks
- Add new icons: export from Figma → run `npm run icons:sync` → commit → push
- Update icon categories: edit `metadata/icons.json` after `generate-metadata.mjs`
- Debug: Check browser console for 404 errors on missing SVGs
