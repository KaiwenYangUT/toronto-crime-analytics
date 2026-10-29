"""Fetch checksum-pinned fonts/CLI for P1 probes, with all outputs inside .cache."""

import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]


def cached_path(name: str) -> Path:
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT / ".cache"):
        raise ValueError(f"Asset must stay inside project cache: {name}")
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


for entry in json.loads((ROOT / "parity/spikes/assets.json").read_text())["assets"]:
    target = cached_path(entry["path"])
    if target.exists():
        content = target.read_bytes()
    else:
        with urlopen(entry["url"], timeout=120) as response:
            content = response.read()
    if hashlib.sha256(content).hexdigest() != entry["sha256"]:
        raise ValueError(f"Asset checksum mismatch: {entry['path']}")
    if not target.exists():
        with target.open("xb") as stream:
            stream.write(content)
    if "extract" in entry:
        with ZipFile(io.BytesIO(content)) as archive:
            for member, destination in entry["extract"].items():
                output = cached_path(destination)
                expected = archive.read(member)
                if output.exists() and output.read_bytes() != expected:
                    raise ValueError(f"Extracted asset changed: {destination}")
                if not output.exists():
                    with output.open("xb") as stream:
                        stream.write(expected)
                if output.name == "pmtiles":
                    output.chmod(0o755)
    print(f"Verified {entry['path']}")
