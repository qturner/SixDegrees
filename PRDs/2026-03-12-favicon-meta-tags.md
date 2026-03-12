# PRD: Favicon & Meta Tag Fix

**Date:** 2026-03-12
**Priority:** Quick fix
**Reporter:** Q (spotted missing favicon in X link previews)
**Assignee:** Dylan

---

## Problem

The site has a `favicon.png` (1024x1024, app icon) in `/client/public/` but no `<link rel="icon">` tags in `index.html`. Browsers and social crawlers (X, Discord, iMessage, etc.) can't discover it, so link preview cards show a generic placeholder icon.

Additionally, `og:image` is missing from the meta tags, so link previews on X/Discord/iMessage don't show the Six Degrees branding.

## Changes Required

### 1. Generate favicon sizes

From the existing `favicon.png` (1024x1024), generate:

```
favicon-16x16.png   (16x16)
favicon-32x32.png   (32x32)
apple-touch-icon.png (180x180)
favicon.ico          (multi-size .ico — 16+32+48)
```

Place all in `/client/public/`.

Quick generation (Python/PIL):
```python
from PIL import Image
img = Image.open("client/public/favicon.png")
for size, name in [(16, "favicon-16x16.png"), (32, "favicon-32x32.png"), (180, "apple-touch-icon.png")]:
    img.resize((size, size), Image.LANCZOS).save(f"client/public/{name}")
```

For `.ico`, use: `img.resize((48,48)).save("client/public/favicon.ico", format="ICO", sizes=[(16,16),(32,32),(48,48)])`

### 2. Add to `<head>` in `index.html`

After the existing `<meta>` tags (around line 11), add:

```html
<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="shortcut icon" href="/favicon.ico">

<!-- OG Image (for link previews on X, Discord, iMessage, etc.) -->
<meta property="og:image" content="https://sixdegrees.app/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://sixdegrees.app/og-image.jpg">
```

Note: `og-image.jpg` already exists in `/client/public/`. Just needs the meta tags to reference it.

### 3. Verify

After deploy:
- Check `https://sixdegrees.app/favicon-32x32.png` loads
- Test link preview: paste `https://sixdegrees.app` in X/Discord — should show favicon + OG image
- Use [Twitter Card Validator](https://cards-dev.twitter.com/validator) to confirm

---

## Files Changed

- `client/public/favicon-16x16.png` (new)
- `client/public/favicon-32x32.png` (new)
- `client/public/apple-touch-icon.png` (new)
- `client/public/favicon.ico` (new)
- `client/index.html` (add link + meta tags)

## Estimated Time

5 minutes.
