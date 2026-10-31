#!/usr/bin/env bash
# Provenance of the committed basemap: extract the pinned Toronto basemap (Protomaps, maxzoom 14) into web/public/basemap/ and verify its sha256.
# Source tools/env.sh first. The publisher keeps daily builds only briefly, so keep the verified file.
set -euo pipefail
OUT=web/public/basemap/toronto.pmtiles
SHA=93f086e6378c522f802758e664a2cda8eb1a31cc4d0b2cd7bb49f38ff2bff445
mkdir -p web/public/basemap
if [ ! -f "$OUT" ]; then
  python tools/spikes/fetch_assets.py
  pmtiles extract https://build.protomaps.com/20261029.pmtiles "$OUT" --bbox=-79.64,43.58,-79.12,43.86 --maxzoom=14 --download-threads=4
fi
echo "$SHA  $OUT" | shasum -a 256 -c -
