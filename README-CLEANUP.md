# Everlight — canonical cleanup

This build removes the accumulated patch layer and keeps one runtime stylesheet.

## Runtime structure

- `styles.css` — the only stylesheet loaded by the app.
- `app.js` — application behavior and the single desktop/mobile navigation owners.
- `theme.js` — theme handling.
- `server.js` — backend.

## Removed dead/duplicate runtime files

- `enhancements.css` — removed; its rules were canonicalized into `styles.css`.
- `desktop-nav-controller.js` — removed; it was not loaded by `index.html`.
- `replace_share.py` — removed; it was an old one-off patch helper and was not referenced by the runtime.

## CSS cleanup

The old patch-history comments and repeated selector blocks were consolidated. The resulting stylesheet keeps the existing cascade order as closely as possible while merging repeated selectors inside the same responsive context and removing exact duplicate declarations.

The application now loads a single versioned stylesheet:

`styles.css?v=20260820-clean-canonical-1`
