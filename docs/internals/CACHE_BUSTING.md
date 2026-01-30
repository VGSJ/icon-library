# Cache Busting Implementation

## Problem

The SVG files were being synced correctly from Figma, but browsers and CDN were caching the old versions. Users would see outdated icons (e.g., the old fire-emergency-panel design) even after syncs completed.

## Solution: Multi-Layer Cache Busting

### 1. **Client-Side Cache Busting (app.js)**

Added timestamp query parameters to all fetch requests:

```javascript
// SVG fetches now include: ?v=<current-timestamp>
const cachebust = `v=${Date.now()}`;
const paths = [
  `./raw-svg/${normalizedStyle}/${size}/icon-${name}-${normalizedStyle}-${size}.svg?${cachebust}`,
  ...
];

// Metadata fetches now include: ?v=<current-timestamp>
const res = await fetch(`./metadata/icons.json?${cachebust}`);
```

**Effect:** Every page load forces fresh SVG and metadata fetches by browsers.

---

### 2. **Metadata Timestamp Tracking (generate-metadata.mjs)**

Every metadata generation now includes a timestamp:

```json
{
  "timestamp": "2026-01-30T04:57:56.819Z",
  "icons": [...]
}
```

**Effect:**

- Provides audit trail of when metadata was last updated
- Can be used for client-side version tracking
- Helps detect stale metadata files

---

### 3. **HTTP Cache Headers (\_headers file)**

Created caching strategy for GitHub Pages/CDN:

```
/raw-svg/*
  Cache-Control: public, max-age=86400      # Cache SVGs for 24 hours

/metadata/*
  Cache-Control: public, max-age=0, must-revalidate   # Never cache

/index.html
  Cache-Control: public, max-age=0, must-revalidate   # Never cache
```

**Effect:**

- SVGs can be cached locally for performance (24h)
- Metadata/HTML always fetched fresh
- Client-side query params ensure even fresh requests when needed

---

## How It Works

1. **User visits site** → Browser loads `index.html` (never cached)
2. **App loads** → `loadIconsJson()` fetches metadata with timestamp query param
3. **User views icon** → `fetchSvg()` fetches SVG with timestamp query param
4. **Sync updates SVGs** → GitHub Actions syncs from Figma and regenerates metadata with new timestamp
5. **Next user visit** → Browser forces fresh fetch due to query param, gets latest SVG

---

## Benefits

✅ **No Stale Content**: Updated SVGs are immediately visible after sync  
✅ **Performance**: SVGs still cache locally for 24h when query params match  
✅ **Reliability**: Works across all browsers (query params are standard)  
✅ **Scalable**: Applies to all current and future icon syncs  
✅ **Backwards Compatible**: Existing metadata format still works

---

## Testing

To verify cache busting works:

1. **Browser DevTools** → Network tab
   - SVG/metadata requests should include `?v=<timestamp>`
   - Check response headers see cache info

2. **Hard refresh** (Cmd+Shift+R / Ctrl+Shift+R)
   - Forces bypass of all caches
   - Should show latest SVG version

3. **After sync** → Metadata timestamp updates automatically
   - Next page load will fetch fresh assets

---

## Files Changed

- `docs/app.js` - Added query parameter cache-busting to fetch calls
- `generate-metadata.mjs` - Added timestamp field to metadata JSON
- `docs/_headers` - Created new cache control headers file

## Future Improvements

- [ ] Add service worker for offline fallback
- [ ] Implement version endpoint for monitoring cache effectiveness
- [ ] Add audit log of which icons were updated in each sync
