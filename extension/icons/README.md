# Extension Icons

This folder needs 4 PNG icon files for the KTP Referral Finder extension:

- `icon16.png` — 16×16 pixels (toolbar)
- `icon32.png` — 32×32 pixels (Windows)
- `icon48.png` — 48×48 pixels (extensions management page)
- `icon128.png` — 128×128 pixels (Chrome Web Store)

These icons are displayed in the Chrome toolbar and on the Chrome Web Store listing.

Once the actual PNG assets are added, update `manifest.json` with an `icons` field pointing to these files:

```json
"icons": {
  "16": "icons/icon16.png",
  "32": "icons/icon32.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

For local development and testing, Chrome will show a default puzzle piece icon if these files are missing. The extension will still function correctly without them.
