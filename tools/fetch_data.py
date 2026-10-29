"""Fetch the pinned input snapshot; mismatches always stop without overwriting data."""

import hashlib
import json
import shutil
import sys
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def verify(path: Path, entry: dict) -> None:
    actual = {"bytes": path.stat().st_size}
    for algorithm in ("md5", "sha256"):
        with path.open("rb") as stream:
            actual[algorithm] = hashlib.file_digest(stream, algorithm).hexdigest()
    for key, value in actual.items():
        if value != entry[key]:
            raise ValueError(f"Checksum mismatch: {path.name} {key}: {value} != {entry[key]}")


def fetch(entry: dict, raw: Path, reference: Path, snapshot_url: str) -> str:
    name = entry["file"]
    if Path(name).name != name:
        raise ValueError(f"Invalid manifest filename: {name}")
    destination = raw / name
    if destination.exists():
        verify(destination, entry)
        return "verified cached"

    source = reference / name
    partial = raw / f"{name}.part"
    if partial.exists():
        # A complete interrupted download is reusable; corrupt partials need explicit review.
        verify(partial, entry)
        method = "resumed verified partial"
    elif source.exists():
        verify(source, entry)
        with source.open("rb") as incoming, partial.open("xb") as outgoing:
            shutil.copyfileobj(incoming, outgoing)
        method = "copied pinned reference"
    else:
        with (
            urlopen(snapshot_url + quote(name), timeout=120) as incoming,
            partial.open("xb") as outgoing,
        ):
            shutil.copyfileobj(incoming, outgoing)
        method = "downloaded pinned snapshot"
    verify(partial, entry)
    partial.rename(destination)
    return method


def main() -> None:
    manifest = json.loads((ROOT / "data/manifest.json").read_text())
    raw = ROOT / "data/raw"
    raw.mkdir(parents=True, exist_ok=True)
    for entry in manifest["files"]:
        method = fetch(entry, raw, ROOT / manifest["reference"], manifest["snapshot_url"])
        print(f"{entry['file']}: {method}; MD5 and SHA-256 OK")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        sys.exit(1)
