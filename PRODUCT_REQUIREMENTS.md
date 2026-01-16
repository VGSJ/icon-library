# Icon Library - Product Requirements Document

## Overview
A web-based icon library browser with real-time search, category filtering, and SVG/PNG export capabilities. Users can browse 1,161+ icons across 28 categories, search by name/tags/aliases, and download in multiple formats and sizes.

---

## Core Features

### 1. Icon Grid Display
- **Grid Layout**: Auto-fill grid with 72px icon cells, 32px gaps
- **Display**: SVG icons centered in preview boxes (64×64px)
- **Hover State**: Background darkens, border highlights with primary color (#1257FD)
- **Selected State**: 2px primary border with subtle shadow (rgba(18,87,253,0.1))
- **Scroll**: Vertical scroll with momentum scrolling on mobile

### 2. Search & Filter
- **Search Bar**: Circular pill-shaped input (400px wide, inside header)
- **Search Scope**: Name, tags, aliases, category
- **Clear Button**: 'X' icon inside search field (right side), appears only when text entered
- **Real-time**: Results update instantly as user types
- **Dynamic Counts**: Sidebar category counts update to show only matching icons per category

### 3. Sidebar Navigation
- **Width**: 320px, scrollable
- **Title**: "CATEGORIES" (12px, uppercase, muted color)
- **All Icons**: Pinned at top, always selectable
- **Category List**: Sorted alphabetically (A-Z)
- **Count Display**: Each category shows icon count (updates on search)
- **Active State**: Primary blue background, white text, bold font
- **Hover State**: Dark card background

### 4. Details Panel (Right Sidebar)
- **Width**: 320px
- **Trigger**: Click any icon to open
- **Animation**: Slides in from right (200ms ease)
- **Close**: Click another icon or click outside panel
- **Padding**: 20px internal

#### Details Panel Sections:

**Icon Preview**
- 100% width, aspect ratio 1:1
- Card background with dashed border
- Centered SVG/PNG display

**Copy/Download Buttons**
- Two lime green buttons (#84cc16): "Copy" and "Download"
- Full width, equal split
- Hover: Lighter lime (#a3e635)
- Copy: Copies image to clipboard (SVG or PNG based on selection)
- Download: Downloads file with naming convention: `icon-[name]-[style]-[size].svg/png`

**File Type Selector**
- Label: "FILE TYPE" (12px uppercase, muted)
- Buttons: SVG (default, primary blue) | PNG (secondary, bordered)
- Toggle between formats

**Size Selector**
- Label: "SIZE (PX)" (12px uppercase, muted)
- Buttons: 16, 24, 32, 40, 48, 64, 72 (dynamically shown based on icon availability)
- Default: 24px
- Selected button: Primary blue background

**Metadata Display**
- Label: "METADATA" (12px uppercase, muted)
- Show: Icon name, category, tags (comma-separated), aliases (comma-separated)
- Font: 13px, monospace for values
- Non-selectable text

---

## Data Structure

### Icon Metadata (JSON)
```json
{
  "id": "icon-mouse-left",
  "name": "mouse-left",
  "category": "actions & general interface",
  "tags": ["mouse", "click", "pointer", "action"],
  "aliases": ["cursor-click", "mouse-pointer"],
  "availableSizes": [16, 24, 32, 40, 48, 64, 72],
  "styles": ["outline", "filled"]
}
```

### File Organization
```
/docs/raw-svg/
  ├── outline/
  │   ├── 16/
  │   ├── 24/
  │   ├── 32/
  │   ├── 40/
  │   ├── 48/
  │   ├── 64/
  │   └── 72/
  └── filled/
      ├── 16/
      ├── 24/
      ├── 32/
      ├── 40/
      ├── 48/
      ├── 64/
      └── 72/

/docs/metadata/
  └── icons.json (complete metadata for all icons)
```

---

## Technical Specifications

### Frontend Stack
- **HTML5**: Semantic markup
- **CSS3**: Variables, flexbox, grid, animations
- **JavaScript**: Vanilla (no frameworks)
- **Browser Support**: Chrome, Firefox, Safari, Edge (latest versions)

### Styling System
**CSS Variables** (in `:root`):
```css
--bg: #131313 (main background)
--fg: #f2f2f2 (foreground text)
--muted: #b0b0b0 (secondary text)
--card: #1a1a1a (card background)
--border: #2a2a2a (border color)
--primary: #1257FD (accent blue)
```

**Dark Theme**: All UI elements use the above variables
**WCAG Compliance**: AA/AAA contrast standards on all text/backgrounds
**Font**: Aptos (system fallback: -apple-system, Segoe UI, Roboto, sans-serif)

### Layout
- **Header**: 
  - Height: 56px (16px padding top/bottom + 24px content)
  - Sticky at top, z-index: 10
  - Contains: Logo, search bar, controls
  
- **Main Container**: 
  - 3-column flex layout: Sidebar | Grid | Details Panel
  - Min-height: 100% (full viewport)
  
- **Sidebar**: 
  - Width: 320px, fixed
  - Scrollable independently
  
- **Grid**:
  - Flex: 1 (takes remaining space)
  - Overflow-y: auto
  - Grid: auto-fill columns, minmax(72px, 1fr)
  
- **Details Panel**:
  - Width: 320px, fixed
  - Slides in from right on icon selection
  - Hidden by default (transform: translateX(100%))

### Interactions

**Search**
- Debounce: 150ms
- Case-insensitive matching
- Search across: name, tags, aliases, category
- Update all category counts in real-time
- Clear button clears input and resets view

**Icon Selection**
- Click icon → open details panel
- Click different icon → swap details content
- Click outside panel → close (optional)
- Selected state persists until another selection

**Format/Size Selection**
- Click button → update preview and download/copy behavior
- Selected button state: Primary blue (#1257FD)
- SVG default, sizes default to 24px

**Copy to Clipboard**
- SVG: Copy raw SVG code
- PNG: Copy rendered PNG image (canvas-based)
- Toast notification: "Copied!" appears 140ms, fades after 2s

**Download**
- Generate file with proper MIME type
- Filename format: `icon-[name]-[style]-[size].[ext]`
- Trigger browser download dialog

---

## Data Source & Sync

### Figma Integration
- **Source**: Figma icon library file
- **Metadata Format** (in Figma description):
  ```
  category: [category-name]
  tags: [comma-separated-tags]
  aliases: [comma-separated-aliases]
  ```

- **Sync Process**:
  1. `npm run sync-category [category-name]` downloads all icons from Figma category
  2. Script extracts metadata from component descriptions
  3. Downloads all size/style variants (5-7 sizes × 2 styles = 10-14 files per icon)
  4. `node generate-metadata.mjs` creates icons.json
  5. Metadata corrections applied (metadata-corrections.json)
  6. Deploy to GitHub Pages

### Metadata Corrections
- File: `/metadata-corrections.json`
- Purpose: Override/fix Figma metadata (duplicate names, wrong categories, etc.)
- Applied before generating final icons.json

---

## Export Formats

### SVG Export
- Raw SVG code copied to clipboard or downloaded as file
- File type: `image/svg+xml`

### PNG Export
- Canvas-based rendering at 3x resolution for quality
- Export at requested size (16-72px)
- File type: `image/png`

---

## Performance Targets
- **Grid Render**: < 500ms (1,000+ icons)
- **Search Response**: < 100ms (debounced)
- **Icon Selection**: Instant (< 50ms)
- **PNG Generation**: < 200ms
- **Mobile Performance**: Smooth scrolling at 60fps

---

## Accessibility (A11y)
- **Semantic HTML**: Use proper heading, button, and section elements
- **ARIA Labels**: All interactive elements have descriptive labels
- **Keyboard Navigation**: Tab through categories, arrows to select, Enter to open
- **Color Contrast**: WCAG AA minimum on all text
- **Screen Readers**: Icon names and descriptions readable

---

## Future Enhancements
- Collections/favorites (local storage)
- Bulk export (zip multiple icons)
- Custom color variants
- Animation preview (if icons have variants)
- Dark/light theme toggle (currently dark only)
- API endpoint for programmatic access

---

## Deployment
- **Host**: GitHub Pages
- **Build**: Static HTML/CSS/JS (no build step)
- **Update**: Push to GitHub → automatic deploy
- **CDN**: GitHub Pages CDN

---

## Current Stats
- **Total Icons**: 1,161
- **Total Categories**: 28
- **Total Variants**: ~16,500+ (5-7 sizes × 2 styles per icon)
- **Supported Sizes**: 16, 24, 32, 40, 48, 64, 72px
- **Styles**: Outline, Filled

---

## Workflow (See RULES.md for detailed steps)
1. Add/update icons in Figma with proper metadata
2. Run sync: `node scripts/sync-category.mjs [category-name]`
3. Run generate: `node generate-metadata.mjs`
4. Commit & push to GitHub
5. Verify on live site (auto-deployed)
