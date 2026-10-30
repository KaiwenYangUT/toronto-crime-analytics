"""Write the Explore legacy bundle: the 25,242 Explorer records as columnar little-endian binary.

Layout (all arrays have n entries, written back to back in this order, so every array starts
on a boundary matching its element size): lon f64, lat f64, event_class u32, day u16, hour u8,
category u8, status u8, premises u8, location u8. Coordinates keep every float64 bit so the
radius boundary cases match R exactly. ``event_class`` is an integer equivalence class of the
event ID: the interface needs only distinct-ID counts, so no ID strings ship. ``day`` is the
number of days since 1970-01-01 and the weekday is derived from it.
"""

from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from tca.build import explore_legacy
from tca.io import ROOT

OUT_DIR = ROOT / "web" / "public" / "data" / "explore"
COLUMNS = [
    ("lon", "<f8"),
    ("lat", "<f8"),
    ("event_class", "<u4"),
    ("day", "<u2"),
    ("hour", "u1"),
    ("category", "u1"),
    ("status", "u1"),
    ("premises", "u1"),
    ("location", "u1"),
]


def _codes(series: pd.Series, order: list[str] | None = None) -> tuple[np.ndarray, list[str]]:
    labels = order if order is not None else sorted(series.unique())
    lookup = {v: i for i, v in enumerate(labels)}
    return series.map(lookup).to_numpy(dtype="u1"), list(labels)


def build_arrays(events: pd.DataFrame) -> tuple[dict[str, np.ndarray], dict[str, list[str]]]:
    category, categories = _codes(events["category"], ["Bicycle theft", "Robbery", "Theft over"])
    status, statuses = _codes(events["status"])
    premises, premises_labels = _codes(events["premises_type"])
    location, locations = _codes(events["location_type"])
    classes, _ = pd.factorize(events["event_id"], sort=True)
    day = ((events["date"] - pd.Timestamp("1970-01-01")).dt.days).to_numpy()
    arrays = {
        "lon": events["longitude"].to_numpy("<f8"),
        "lat": events["latitude"].to_numpy("<f8"),
        "event_class": classes.astype("<u4"),
        "day": day.astype("<u2"),
        "hour": events["hour"].to_numpy("u1"),
        "category": category,
        "status": status,
        "premises": premises,
        "location": location,
    }
    dictionaries = {
        "category": categories,
        "status": statuses,
        "premises": premises_labels,
        "location": locations,
    }
    return arrays, dictionaries


def write_legacy_bundle(out_dir: Path = OUT_DIR) -> dict:
    events, _ = explore_legacy()
    arrays, dictionaries = build_arrays(events)
    out_dir.mkdir(parents=True, exist_ok=True)
    blob = b"".join(arrays[name].astype(dtype).tobytes() for name, dtype in COLUMNS)
    (out_dir / "legacy.bin").write_bytes(blob)
    offset, layout = 0, []
    for name, dtype in COLUMNS:
        layout.append({"name": name, "dtype": dtype.lstrip("<|"), "offset": offset})
        offset += arrays[name].astype(dtype).nbytes
    meta = {
        "n": len(events),
        "endianness": "little",
        "columns": layout,
        "dictionaries": dictionaries,
        "first_day": int(arrays["day"].min()),
        "last_day": int(arrays["day"].max()),
        "bytes": len(blob),
        "gzip_bytes": len(gzip.compress(blob, 9)),
        "sha256": hashlib.sha256(blob).hexdigest(),
        "source": "tca.build.explore_legacy (equal to the R Explorer rebuild, see parity/PARITY.md)",
        "n_event_classes": int(arrays["event_class"].max()) + 1,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=1) + "\n")
    return meta


if __name__ == "__main__":
    m = write_legacy_bundle()
    print(f"legacy.bin: {m['n']} records, {m['bytes']} bytes, {m['gzip_bytes']} gzip")
