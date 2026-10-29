# Data sources and licences

Verified against publisher pages on 2026-10-29. This document records data terms;
it does not assign a code licence. No release or deployment has been authorized.

## Toronto Police Service

The seven historical CSVs are pinned in `data/manifest.json`, with publisher
lineage recorded in the original repository's `data/README.md`. The [TPS data
portal](https://data.tps.ca/) links its [Open Data Licence](https://data.tps.ca/pages/licence).
That page is headed “Open Government Licence – Ontario,” identifies version 1.1,
and adds TPS-specific conditions. Its actual text is accessible in the official
[ArcGIS page data](https://torontops.maps.arcgis.com/sharing/rest/content/items/c4ce7f12e64543888a1c251b730a924b/data?f=json).

The published terms allow copying, adaptation, redistribution and commercial
use, with source acknowledgement, accurate representation and lawful use.
They prohibit linkage intended to identify people, businesses or organizations,
and presentation implying access to identifiable TPS records. Personal
information, protected records, third-party rights and official TPS symbols are
excluded. Official status or endorsement must not be implied; data carries no
warranty. Use the specified fallback attribution:

> Contains information licensed under the Open Government Licence – Ontario.

Also identify Toronto Police Service as the source and link the TPS licence.
Joining aggregate census features by neighbourhood must preserve aggregate
analysis and never attempt re-identification.

## City of Toronto census neighbourhood profiles

`Income_Dataset.xlsx` is the historical workbook attributed by the original
repository to [Neighbourhood Profiles](https://open.toronto.ca/dataset/neighbourhood-profiles/).
The catalogue explicitly links the [Open Government Licence – Toronto](https://open.toronto.ca/open-data-licence/),
version 1.0. It permits copying, modification, publication and commercial use,
subject to attribution. The source's specified fallback is:

> Contains information licensed under the Open Government Licence – Toronto.

Link the licence and identify the City of Toronto / Statistics Canada census
neighbourhood profiles. The licence excludes personal information, protected
records, third-party rights and official symbols; it supplies no warranty and
grants no endorsement. The workbook is a historical snapshot, not a current
download; its original download date and byte identity to today's catalogue
resource have not been established.

## Snapshot and publication boundaries

`data/manifest.json` fixes original bytes at the agreed JSC370 commit, records
MD5/SHA-256, and names publisher and immutable GitHub retrieval locations.
Checksums establish input identity, not independent ownership verification.
The TPS portal has moved from `data.torontopolice.on.ca` to `data.tps.ca`;
the manifest retains the original publisher pointer for lineage.

Raw inputs remain uncommitted. Derived website data must preserve these
attributions and applicable terms. Assault, bicycle theft, homicide and
shootings are excluded from the unified **Robbery vs other major property
crime** task; historical inputs are retained only for faithful legacy reruns.

Explorer code, team credits and consent remain Q2. Its recovered station and
destination coordinates have incomplete provenance; these licence checks do
not establish their source or redistribution rights. They require separate
verification before publication. Map assets will need their own OpenStreetMap /
Protomaps attribution and terms; the P1 range-request spike is not permission
to publish a basemap.

Verification URLs and the hash of the retrieved TPS licence page data are in
`parity/licence-sources.json`. Machine-local response snapshots are retained in
`.cache/logs/`; fetch them again to verify current terms when releasing.
