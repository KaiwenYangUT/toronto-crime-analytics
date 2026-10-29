# P1 technical spikes

These are synthetic infrastructure probes, not analysis results or parity passes.
Run commands from the repository root after `source tools/env.sh`.

## PMTiles and HTTP ranges — passed

- PMTiles CLI 1.31.2 extracted Toronto from the pinned publisher build
  `https://build.protomaps.com/20261029.pmtiles`, bbox
  `-79.64,43.58,-79.12,43.86`, maximum zoom 14. The extract is 20,000,136 bytes,
  below the 45 MB budget, and `pmtiles verify` passes. The archive is ignored in
  `build/spikes/map/`; checksum and header are in `map-ranges.json`.
- `node tools/spikes/map_ranges.mjs` starts Vite preview under
  `/toronto-crime-analytics/`, checks an interior byte range against the source
  file, decodes the header and a Toronto zoom-12 vector tile through pmtiles.js,
  then closes its server. All three requests return 206 with correct
  `Content-Range`, exact lengths and no content encoding. Total requested bytes:
  119,442. This is a one-tile probe; a complete MapLibre viewport and its 1 MB
  budget remain P6 acceptance criteria.
- A read-only request for bytes 0–126 against the official public sample
  `https://protomaps.github.io/PMTiles/protomaps(vector)ODbL_firenze.pmtiles`
  redirects to `https://pmtiles.io/protomaps(vector)ODbL_firenze.pmtiles`, whose
  response identifies `server: GitHub.com`, status 206,
  `Content-Range: bytes 0-126/6601156`, `Content-Length: 127`,
  `Accept-Ranges: bytes`, and `Access-Control-Allow-Origin: *`. The body starts
  `PMTiles` and version byte 3. Response headers/body remain in
  `.cache/logs/pages-range-*`. This verifies an existing Pages-served sample;
  this project's actual deployment remains untested and unauthorized.
- The publisher retains daily builds only briefly; do not rely on this date
  remaining available at release. P6/P9 must pin and retain a recoverable
  extract source plus hash, self-host glyphs/sprites and preserve OSM attribution.

Reproduction (CLI release URL is in `.cache/logs/pmtiles-release.json`):

```bash
source tools/env.sh
.cache/tools/bin/pmtiles extract https://build.protomaps.com/20261029.pmtiles \
  build/spikes/map/toronto-z14.pmtiles \
  --bbox=-79.64,43.58,-79.12,43.86 --maxzoom=14 --download-threads=4
.cache/tools/bin/pmtiles verify build/spikes/map/toronto-z14.pmtiles
node tools/spikes/map_ranges.mjs
```

Keep existing cached archives; verify them before reuse. Do not discard an
interrupted/corrupt file without user approval.

Sources: [official CLI](https://docs.protomaps.com/pmtiles/cli),
[publisher basemap downloads and retention](https://docs.protomaps.com/basemaps/downloads).

## Vega-Lite PDF text and static Inter — passed

`python tools/spikes/font_probe.py` uses vl-convert-python 1.9.0.post1 with
registered Inter 4.1 static `Inter-Regular.otf`. The generated chart retains
searchable title, axis and category text; pypdf confirms the Inter font program
is embedded. The OTF has no `fvar` table (it is not a variable font).
`pdf-fonts.json` records extraction/font checks; `assets.json` pins font source
URLs and SHA-256, including the OFL licence.

`python tools/spikes/fetch_assets.py` restores checksum-verified fonts/CLI into
`.cache/` without overwriting changed assets. Use the bundled PDF runtime for
`tools/spikes/inspect_pdf.py`, or a project-local Python containing pypdf. The
probe is synthetic; it publishes no crime-analysis number. Poppler rendered the
actual chart PDF and the rendered PNG was visually checked: legible, no clipping
or overlap. Files remain ignored under `build/spikes/pdf/`.

Source: [Inter 4.1 release](https://github.com/rsms/inter/releases/tag/v4.1).

## tectonic/fontspec and static Source Serif 4 — passed

Tectonic 0.17.0 compiles the generated `build/spikes/pdf/font-probe.tex` with
fontspec, Source Serif 4 Regular and Inter Regular, including the vector chart.
The output is one page; pypdf finds both static fonts embedded and body/chart
text searchable (`pdf-fonts.json`). Both font files have no `fvar` table.
Poppler rendering was visually checked: no clipping, overlap or missing glyphs.
No overfull boxes remain. Generated files and the downloaded TeX bundle stay
inside the project.

```bash
source tools/env.sh
.venv/bin/python tools/spikes/fetch_assets.py
.venv/bin/python tools/spikes/font_probe.py
tectonic --outdir build/spikes/pdf --keep-logs build/spikes/pdf/font-probe.tex
# Run with the bundled PDF Python, or project-local pypdf:
python tools/spikes/inspect_pdf.py build/spikes/pdf/chart.pdf build/spikes/pdf/font-probe.pdf
```

The font probe writes machine-specific absolute font paths only into its
ignored generated TeX file. Tectonic warns about those paths, and its inclusion
checker warns about a PDF 1.7 chart versus a 1.5 inclusion default even when the
output PDF version is raised. Rendering, searchability and embedding pass; use
project-relative font paths and align PDF versions in the P7 paper build.

Source: [Adobe Source Serif static OTFs at pinned commit](https://github.com/adobe-fonts/source-serif/tree/80d3f8894c09c937bebfa9011247d2e1c79fd6f4/OTF).
