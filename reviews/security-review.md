# Security review (P8, manual)

Scope: everything added or changed since the P6 review (`5873867..HEAD`) plus the web surfaces that handle
untrusted input. The `/security-review` skill could not run (it needs an `origin` remote, and nothing is pushed),
so this was done by reading the code. The product is a static site and a LaTeX paper: no server, no accounts,
no secrets, no user-written data.

| # | Surface | Finding | Severity | Status |
|---|---|---|---|---|
| 1 | `web/scripts/serve-site.mjs` (local preview only) | Prefix check `file.startsWith(root)` would also accept a sibling folder such as `site-evil`; a malformed `%` escape made `decodeURIComponent` throw and crash the server | low (dev tool) | fixed: separator-aware check, 400 on bad escapes |
| 2 | `web/src/explore/state.ts` `fromParams` | URL weekday values were range-checked but not required to be integers | low (no injection; values only filter numbers) | fixed: `Number.isInteger` |
| 3 | `dangerouslySetInnerHTML` in `VegaChart.tsx` and `root.tsx` | SVG strings are rendered at build time from our own specs and results (Vega escapes text); the theme script is a constant. No user input reaches either | none | no change |
| 4 | Explore URL state | every parameter is validated against an allowlist (modes, place ids, categories, presets, intervals, date round-trip) before use | none | no change |
| 5 | Build and data fetching | inputs are pinned by sha256 (`data/manifest.json`, `parity/spikes/assets.json`, basemap checksum); a mismatch is a hard stop. Fonts added in P7 are pinned too | none | no change |
| 6 | LaTeX | tectonic runs without `-Z shell-escape`; the document does not call `\write18` | none | no change |
| 7 | Unused scaffold `web/src/App.tsx` | external links with `target="_blank"` and no `rel="noopener"` (modern browsers imply it). The file is unused and awaits deletion approval | nit | open: delete with approval |
| 8 | Licence and privacy | the site makes no third-party requests at runtime (fonts and basemap are self-hosted); no analytics, cookies or storage beyond the theme choice in localStorage | none | no change |

`serve-site.mjs` `listen(port)` binds all interfaces; if the preview is used on an untrusted network pass a host.
