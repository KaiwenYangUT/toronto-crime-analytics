# Explorer baseline inventory

Inventoried 2026-10-29 from the read-only reference at
`_reference/explorer`, commit `dd5d689e6a9e83e09f64de0b12d77d30793c6356`.
This is the pinned modernized STA313 implementation, not the earlier recovered
monolithic project. All paths and line citations below are relative to that
reference unless prefixed otherwise. Inspection was static: no app, data build,
dependency install, or tests were run for this inventory. Published validation
claims below require independent P2 reproduction.

## Scope and available evidence

- The app has Introduction, Destinations, Transit, and About the data tabs; it
  initially selects Introduction (`app.R:12–16,20–48`). Destinations and Transit
  instantiate the same explorer module with different spatial centers
  (`app.R:36–37,52–53`).
- The legacy Explorer categories, in order, are **Bicycle theft**, **Robbery**,
  **Theft over** (`R/analysis.R:2`). They differ deliberately from this project's
  unified robbery-vs-other-major-property-crime task. Bicycle theft belongs only
  to the legacy Explorer parity scope; do not silently substitute unified rows.
- The build selects occurrence dates from 2020-01-01 onward, with **no coded upper
  endpoint** (`scripts/build_data.R:35`). The supplied snapshot's published upper
  endpoint is 2023-12-31. Do not implement an assumed 2023 cutoff as legacy logic.
- The tracked source tree contains `data/processed/.gitkeep` only under `data/`.
  None of `Bicycle_Thefts_Open_Data.csv`, `Robbery_Open_Data.csv`,
  `Theft_Over_Open_Data.csv`, or `data/processed/crime.rds` is in the pinned clone.
  README explicitly excludes generated datasets (`README.md:98–114`), and
  `.gitignore:11–14` excludes processed data and raw data. An original RDS cannot
  yet be compared byte-for-byte from this clone alone. Preserve/recover a known
  original bundle if available; otherwise identify the rebuilt bundle as such.
- The two committed JPEGs are presentation evidence: `introduction.jpg` shows
  Introduction; `preview.jpg` shows Transit with unrestricted filters and all
  categories. They were visually inspected. They are not machine-readable source
  outputs or substitutes for fixtures. No embedded numeric table or fitted model
  is present in the app.

## Every app display and chart

Each module contains the following outputs; all depend on its own shared
`selected()` reactive selection (`R/explorer.R:40–49`). The two modules have
independent inputs/state.

| ID / display | Type, content, and invariant | Source |
|---|---|---|
| Global header | Historical reported-record date coverage, computed as range of the whole bundle; safety/exposure caveat | `app.R:11,17–19` |
| Introduction coverage sentence | Minimum and maximum occurrence date, total analysis rows formatted with thousands separators, and three categories | `app.R:25–26` |
| Introduction guidance | Choose destination or nearest listed station; category/radius controls affect every display; default weekly trends with daily/monthly alternatives | `app.R:27–35` |
| `summary` | Number of selected analysis rows and count of unique selected `event_id`, both comma formatted. Scope is “All supplied locations; no radius filter.” or selected center name and radius in metres. Station mode adds nearest-in-supplied-list qualification | `R/explorer.R:50–58` |
| `map` | Leaflet/OpenStreetMap point map with default marker clusters; one marker per selected analysis row, not one per event ID. Plain-text label is category · date · zero-padded hour `HH:00`. Shows all destination circles without radius filtering, or only current center circle plus radius boundary when local. No density normalization or choropleth | `R/explorer.R:62–77` |
| `daily` / “Records over time” | Native Plotly line chart: one category trace per selected category; x = day/week/month bucket date, y = sum of selected records; default weekly. Category colors below; width 2; `connectgaps=FALSE`. Hover reports bucket date, category, integer comma-formatted count, and included-day count. Y-axis “Records”, zero baseline; date x-axis; horizontal legend; unified x hover; zoom drag and double-click reset. UI warns about selected dates/hours, Monday weeks and partial boundaries | `R/explorer.R:18–21,78–100`; aggregation `R/analysis.R:53–70,90–106` |
| `category` / “Categories” | Vertical count bars in fixed category order, with zeros for nonselected/absent categories when any records remain. All bars blue; y = “Records”; no percentages | `R/explorer.R:102–112` |
| `weekday` / “Weekdays” | Vertical count bars in fixed Monday–Sunday order, zeros retained; y = “Records”; same blue bars | `R/explorer.R:102–113` |
| `hour` / “Hours” | Vertical count bars in fixed 0–23 order, zeros retained; y = “Records”; same blue bars | `R/explorer.R:102–114` |
| Download | CSV of **daily** counts irrespective of plotted interval; columns `date,category,count,scope,radius_m,time_preset,selected_weekdays,selected_hours`; no row names; missing counts/radius written blank. Filename `toronto-crime-daily-<current date>.csv` | `R/explorer.R:115–124` |

The three bar charts use ggplot columns converted with `ggplotly()`, a minimal
theme, and x labels rotated 45 degrees (`R/explorer.R:107–110`). Category line
colors are Bicycle theft `#0072B2`, Robbery `#D55E00`, Theft over `#009E73`
(`R/analysis.R:3`). Destination/center and radius boundaries use purple `#6A3D9A`
(`R/explorer.R:70–74`). Preserve chart forms and count meanings during parity;
the product's eventual chart/map libraries are governed by the project plan.

There is no authored numerical claim that one category/weekday/hour is highest,
no causal conclusion, and no future prediction in these chart captions. Preserve
the neutral reported-record exploration message. The screenshot visibly has
seasonal variation and unequal bars, but no exact bar/line values are printed;
do not transcribe approximate heights into asserted results. Its marker-cluster
numbers are viewport/cluster-dependent rendered summaries, not fixed headline
statistics; exact marker membership/counts should be checked from rebuilt data.
Basemap road numbers and third-party labels are not analysis output.

## All published numerical results and non-result labels

| Claim | Published value | Source / status |
|---|---|---|
| Prepared analysis rows | 25,242 | `README.md:42`; `VALIDATION.md:9`; `CHANGELOG.md:17`; both JPEGs. Published, not reproduced here |
| Prepared distinct event IDs | 25,068 | `VALIDATION.md:9`; `CHANGELOG.md:17`; `preview.jpg`. Published, not reproduced here |
| Prepared coverage | 2020-01-01 through 2023-12-31 | `VALIDATION.md:9`; README month-level coverage at `README.md:42`; both JPEGs |
| Destinations / listed stations | 15 / 11 | `README.md:42,58`; directly countable from `config/places.csv:2–16`, `config/stations.csv:2–12` |
| Little Canada destination, 300 m | 566 analysis rows / 563 distinct IDs | `VALIDATION.md:11`; published browser check |
| Nearest listed station Dundas, 300 m | 702 analysis rows / 697 distinct IDs | `VALIDATION.md:11`; published browser check |
| Robbery-only Transit | 8,455 records | `VALIDATION.md:30`; published browser check. The prose does not specify every active filter, so confirm the unrestricted baseline rather than assuming it |
| Older recovered runtime bundle | 24,997 records / 24,853 distinct IDs | `CHANGELOG.md:17`; historical comparison, **not** pinned modernized baseline. Status inclusion, retained fields and validation explain why equality is not expected |
| Analytical checks | 28 with prepared bundle | `VALIDATION.md:6`; source contains 23 unconditional and 5 conditional real-data checks (`tests/test_analysis.R:10–62`) |
| Weekly peak-hour test | 168 hours partitioned, 35 peak hours | `tests/test_analysis.R:13–18`; contract/test quantities, not empirical crime findings |
| Distance test | One equatorial degree ≈111.2 km; assertion within 1 m of 111,195 m | `tests/test_analysis.R:21–22`; mathematical test quantity |
| Team size / course | Six students; STA 313 | `README.md:63`; `PROVENANCE.md:5`; `DESCRIPTION:4–8` |
| Original runtime labels | R ≥4.1; tested R 4.5.3 and Shiny 1.14.0 | `README.md:85`; `DESCRIPTION:12`; `VALIDATION.md:10`; original package-version snapshot in `DEPENDENCIES.csv:1–95`, not an install lock |

Other displayed numerals are controls/labels: occurrence dates span the bundle;
weekdays 1–7 map to Mon–Sun; hours are inclusive 0–23, default full day; radius
100–2,000 m, default 300 m, step 100 m; preset month/hour/date labels appear in
the UI; default time detail is weekly (`R/explorer.R:7–19`). These are rule values,
not empirical estimates. There are no confidence intervals or inferential tables
in this reference. The only app data table is the downloaded CSV; README's
question/action table (`README.md:27–34`) is navigational prose.

## Filter semantics to reproduce exactly

1. **Defaults:** date range = range of all prepared event dates; categories = all
   three in fixed order; time preset = all; weekdays = all seven; hours = [0,23];
   local = false; destination = first configured place (Little Canada); radius =
   300 m; time detail = week (`R/explorer.R:3,7–19`). Changing place/radius has no
   selection effect while local is false. Select all categories restores the
   category list without resetting other inputs (`R/explorer.R:30–32`).
2. **Composition:** date start/end inclusive AND category membership AND weekday
   membership AND hour interval inclusive AND preset. Optional spherical distance
   must be ≤ radius, so boundary is inclusive. Missing logical rows are excluded
   by `which(keep)` (`R/analysis.R:35–50`). Empty categories or weekdays select no
   rows. Date and hour intervals are validated. A local center must be one row
   and radius finite/positive; UI range limits are narrower than the analytical
   function's valid positive-radius range (`R/analysis.R:38–48`).
3. **Presets:** all = every row; midterm = February or October; final = April or
   December; break = June–August inclusive OR December day ≥23 OR January day ≤3.
   Peak = Monday–Friday AND hour in 6,7,8,15,16,17,18. Off-peak is exact boolean
   complement; weekends and 19:00 are off-peak (`R/analysis.R:18–32`). These are
   illustrative rules, not official university calendars.
4. **Weekday:** ISO weekday number computed from parsed occurrence date, Monday
   1 through Sunday 7; not taken from a raw weekday field
   (`scripts/build_data.R:23–24`). No timezone conversion or report-date filtering
   is applied.
5. **Spatial mode:** destination mode uses chosen place coordinates; station mode
   computes minimum great-circle distance over the supplied station rows, then
   filters around that station. `which.min` chooses the first list entry on an
   exact tie (`R/explorer.R:33–39`; `R/analysis.R:12–15`). It does not filter around
   both destination and station. There is no complete-network station lookup.
6. **Daily grid:** every selected date × selected category is present. Counts of
   selected rows aggregate by date/category; missing combinations become zero.
   A day becomes NA if its weekday is excluded or **none** of the selected hours
   qualifies for the chosen preset. Eligible zero-record days remain zero. This
   eligibility does not depend on spatial density or observed events
   (`R/analysis.R:53–70`). Callers must supply already-filtered events; the daily
   function does not reapply all row filters itself.
7. **Trends:** day is unchanged calendar date; week starts Monday and can precede
   the selected lower endpoint; month is first day of month. Aggregate sum over
   nonmissing selected dates; all-NA buckets stay NA; `eligible_days` counts
   nonmissing days per category, even zero-count days. Sort date then category.
   Weekly/monthly boundary periods are partial, with no scaling to complete
   weeks/months (`R/analysis.R:90–106`). In daily display the module sets
   `eligible_days=1` for a nonmissing count, 0 otherwise (`R/explorer.R:81–82`).
8. **Empty state:** summary distinguishes empty category selection from other
   zero-result filters; map retains basemap and destination/center geometry but
   no record markers; all charts show validation text “No records match the
   current filters.” Export still writes the daily grid; no categories produces
   an empty table, whereas other empty filters can yield zero/NA cells
   (`R/explorer.R:55–58,62–77,79,104,115–124`).

## Coordinates, maps, and configuration

`haversine_m` uses radians π/180, the spherical haversine formula, Earth radius
6,371,008.8 metres, and clamps its inner value into [0,1] before `asin`
(`R/analysis.R:5–9`). Keep float64 coordinate precision and this operation sequence
for legacy parity. The build's bounding box is strict −80 < longitude < −78 and
43 < latitude < 45; this is a plausibility box rather than Toronto municipal
containment (`scripts/build_data.R:30–33`). No coordinate rounding or projection
is applied.

The map uses `addTiles()` and its attribution; min/max zoom 0/19; unrestricted
view longitude −79.42, latitude 43.7, zoom 11; local view is center at zoom 14.
Destination circles radius 6 screen pixels, opacity .9; radius outline weight 2,
fill opacity .08 (`R/explorer.R:64–76`). Map circles and filters describe geometric
distance rather than routes. Every selected analysis row is mapped, including
rows sharing an event ID. Cluster placement/counts depend on zoom/viewport.

Configuration is copied numerically, not geocoded at runtime. Preserve **all**
original decimals in these files:

| Source rows | Destinations in file order |
|---|---|
| `config/places.csv:2–6` | Little Canada; Nathan Phillips Square; CN Tower; Centre Island; The Distillery District |
| `config/places.csv:7–11` | High Park; Casa Loma; Ripley's Aquarium of Canada; Graffiti Alley; Chinatown centre |
| `config/places.csv:12–16` | Robarts Library; Kelly Library; E.J. Pratt Library; Gerstein Library; University College Library |

First ten have type `tourist`, last five `student`; this type is not a filter in
the pinned module. Station names/order (including capitalization) are Dundas,
Queen, Union, King, High park, dupont, Osgoode, St. Patrick, St.George, Museum,
Queen's Park, each suffixed by its source's Station/station spelling
(`config/stations.csv:2–12`). No new coordinate-source claims are justified:
`PROVENANCE.md:23` says coordinates were extracted from the recovered bundle,
original source unknown; Robarts Library and Centre Island labels were corrected
while coordinates were retained. Authoritative coordinate validation is a future
publication concern, not license to alter parity coordinates.

## Data build and integrity contract

Source filenames map directly to categories; category is not inferred from a raw
MCI field (`scripts/build_data.R:8–9,25`). `data.table::fread` reads each CSV. The
required columns are `EVENT_UNIQUE_ID`, `OCC_YEAR`, `OCC_MONTH`, `OCC_DAY`,
`OCC_HOUR`, `LONG_WGS84`, `LAT_WGS84`, `LOCATION_TYPE`, `PREMISES_TYPE`, with
`STATUS` additionally required for bicycle theft (`scripts/build_data.R:14–17`).
Month = case-sensitive first-three-character match to R `month.abb`; date text
is assembled from integer year/day and matched month. A round-trip date check
rejects invalid/normalized calendar dates (`scripts/build_data.R:18–22`).

Retained analysis fields are `event_id,date,hour,weekday,category,longitude,
latitude,status,location_type,premises_type`. IDs/status/location/premises are
character; hours/weekday integer; coordinates numeric. If a source has no STATUS,
status = “Not applicable” (not a separate exclusion). Validity requires valid
date, nonmissing/nonempty event ID, hour 0–23, finite coordinates inside the
strict box. Select valid occurrence dates ≥2020-01-01; replace remaining NAs with
“Unknown”; apply `unique()` over **every retained field within each input**;
concatenate; sort date/category/event_id and clear row names
(`scripts/build_data.R:23–49`). There is no single-row-per-ID deduplication, no
bicycle-status exclusion, and no cross-source deduplication beyond category being
part of each retained row.

Per-input manifest records filename, MD5, source row count, invalid count,
valid-before-2020 count, exact duplicate removals after period filtering,
retained count, first/last retained date (`scripts/build_data.R:40–44`). Those
per-input values are **not in the pinned source** and must be exported in P2;
do not infer them from the global published total. Bundle stores events, places,
stations, manifest, and integer schema_version 1; saveRDS uses version 3 with xz
compression; build console prints total rows, distinct IDs, coverage, and
manifest (`scripts/build_data.R:50–59`).

`validate_bundle` requires events/places/stations/manifest, nonempty events,
required event fields with no NAs, Date class, known category/hour/weekday and
finite coordinates. Places/stations require nonempty unique IDs, coordinate/name
columns, no NAs, finite coordinates (`R/analysis.R:72–88`). It does **not** assert
schema_version, input checksums, Toronto bounds, date coverage, event uniqueness,
date-to-weekday consistency, station completeness, or number of categories. Keep
the distinction between original validation and stronger future checks.

## Caveats and attribution that must survive the port

- Counts are historical reported **records**, not exposure-adjusted rates,
  personal safety estimates, or predictions. Foot traffic, population/ridership,
  reporting rates, and approximate locations limit comparisons
  (`app.R:18–19,34–35`; `README.md:46–59`). Do not label neighborhoods safe/dangerous
  or choose a supposedly safe route (`README.md:52`).
- Distinct event IDs and analysis records are separate measures; exact retained
  duplicates are removed but multiple records can share an ID (`app.R:44`).
- Bicycle theft includes stolen, recovered and unknown statuses; counts do not
  mean currently missing bicycles (`app.R:43`).
- Stations are an incomplete list; nearest listed station can differ from the
  nearest station in the TTC network; spherical distances are not walking routes
  (`app.R:45`; `PROVENANCE.md:25`). Exam/break presets are illustrative
  (`app.R:46`). Boundary trend buckets can be partial (`R/explorer.R:20`).
- This is a focused three-category view, not all Toronto crime
  (`README.md:44`). It is a student project, not an official TPS application
  (`README.md:79`). Source snapshots may differ from newer exports in dates or
  schema (`README.md:77,114`).
- TPS portal links are generic source acknowledgments, **not exact snapshot
  download URLs** (`README.md:69–79`). Source URLs, original download dates,
  publisher terms and redistribution permissions were unverified in this
  reference; MD5 proves identity, not rights (`PROVENANCE.md:15–23`). About page
  explicitly says redistribution is not approved (`app.R:48`).
- Group contribution credit/permission remains unresolved. Original LICENSE is a
  pending-status notice granting no public redistribution license
  (`LICENSE:1–7`; `PROVENANCE.md:31–33`). This project's Q2 blocks P4c, not this
  read-only P1 inventory. Six-person course origin and Codex-assisted
  modernization are explicitly attributed (`PROVENANCE.md:5–7`).
- Basemap tiles automatically request OpenStreetMap in browser without API key;
  internet is needed for tiles while crime data stays local
  (`app.R:47`; `README.md:122`). Tile availability, capacity suitability and current
  provider terms were not independently established by the source
  (`PROVENANCE.md:27–29`; `VALIDATION.md:18`).

## Original tests and validation evidence

`tests/test_analysis.R:1–3` sources analysis and parses app/R/scripts. Its 23
unconditional checks cover: midterm months; final months; peak/off-peak partition
over 168 weekly hours and 35 peak hours; 19:00 exclusion; inclusive holiday
boundaries; zero coincident distance; equatorial-degree distance; radius filtering;
empty categories; empty weekdays; inclusive date endpoints; composed
weekday/hour/category; daily zero filling and conservation; gaps for excluded
days; empty-category daily grid; incompatible hour/preset gaps; coordinate-based
nearest station; reversed-date rejection; weekly Monday/conservation; monthly
conservation/eligible-day count; all-excluded trend gaps; daily value retention;
empty trends (`tests/test_analysis.R:10–42,53–62`).

Five more checks run **only if** the RDS exists: no exact duplicate event rows;
all three categories represented; recovered bicycle records retained; actual max
date exactly 2023-12-31; unrestricted filters conserve all rows
(`tests/test_analysis.R:43–51`). Thus source's published 28 checks do not mean
all 28 are exercised in a checkout without the bundle.

`tests/test_shiny.R:1–49` uses `shiny::testServer`, not a committed shinytest2
browser snapshot suite. It requires the generated bundle and runtime packages.
For both destination and station mode it asserts unrestricted count/daily sum,
maxZoom 19, rendering each output; per-category markers/tiles and marker-array
length; plotted points for day/week/month; exact local selected IDs vs shared
filter; final months; empty-category summary/table/download; and peak plus
off-peak counts conserving the bundle. It does not test a full browser deployment,
all radii/destinations, dataset checksum verification, mobile accessibility,
load/concurrency, official provenance, or licensing.

CI (`.github/workflows/check.yml:1–10`) runs only `Rscript tests/test_analysis.R`
after checkout/setup-r, with no dependency installation or data build. Without
RDS the conditional real-data checks are skipped. Existing `VALIDATION.md:5–14`
reports local runtime, byte-identical rebuild and browser checks; lines 18–24
explicitly disclaim broader performance/mobile/publication/license verification.
Its follow-up reports full-category marker rendering and trend point checks
(`VALIDATION.md:26–32`). P2 must rerun and record new sessionInfo and results;
published statements alone are not a new parity pass.

## P2 handoff / missing evidence

1. Locate and checksum the three exact historical CSV snapshots; recover original
   crime.rds if available and record its checksum independently of rebuilt output.
   Do not use a current portal export without a documented deviation.
2. Run on writable copies under `build/r-work/`, preserving the reference. Install
   dependencies via main setup; redirect the original library fallback
   `../../work/r-library` through environment/local path patches and document them
   (`scripts/run_app.R:2–6`; `tests/test_shiny.R:1–2`).
3. Export all per-source manifest values and typed event/config tables. Rebuild
   twice and compare RDS bytes; compare against recovered original if obtained.
4. Run all 28 analytical checks with bundle present and both module modes. Add
   the planned browser check separately; source has no committed shinytest2 suite.
5. Produce exact filter/count/daily/trend fixtures, including default selection;
   all individual categories; empty categories/weekdays; time presets/endpoints;
   all places and nearest listed stations; radius boundaries; zero vs NA dates;
   partial week/month bins; CSV scope/filter metadata; published Little
   Canada/Dundas baseline checks. Preserve row-ID multiplicity and coordinate bits.
6. Carry provenance/license/team-permission issues into the project ledger rather
   than silently treating the reference's placeholder license or screenshots as
   permission or quantitative verification.
