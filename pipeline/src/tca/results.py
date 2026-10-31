"""Writing results files with provenance, and the registry that makes their numbers citable.

Every number on the site or in the paper comes from a file written here (AGENTS.md rule 3).
A results file is ``{"_provenance": {...}, "values": {...}}``; ``results/index.json`` lists each
file with its description and the display format of each value, so rounding is decided once.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from tca.definitions import SEED
from tca.io import ROOT

RESULTS_DIR = ROOT / "results"
INDEX = RESULTS_DIR / "index.json"
# Provenance fields that describe the run, not the values; excluded when hashing for identity.
VOLATILE = ("created", "git_sha", "code_dirty")
TIMING_KEYS = (
    "fit_seconds",
)  # wall-clock times vary between runs and are left out of identity hashes


def git_sha() -> str:
    try:
        out = subprocess.run(
            ["git", "-C", str(ROOT), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        )
        return out.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def code_dirty() -> bool:
    """True if tracked source files (anything outside results/) differ from HEAD, so the recorded
    git_sha does not fully describe the code that produced a file."""
    try:
        out = subprocess.run(
            ["git", "-C", str(ROOT), "status", "--porcelain", "--untracked-files=no"],
            capture_output=True, text=True, check=True,
        )  # fmt: skip
    except (subprocess.CalledProcessError, FileNotFoundError):
        return True
    return any(not line[3:].startswith("results/") for line in out.stdout.splitlines())


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def input_hashes(names: list[str]) -> dict[str, str]:
    """SHA-256 of raw inputs, taken from the verified manifest (``make data`` checks the files)."""
    if not names:
        return {}
    manifest = json.loads((ROOT / "data" / "manifest.json").read_text())
    files = {f["file"]: f["sha256"] for f in manifest["files"]}
    return {n: files[n] for n in names}


def _drop_timing(node: object) -> None:
    if isinstance(node, dict):
        for key in TIMING_KEYS:
            node.pop(key, None)
        for child in node.values():
            _drop_timing(child)
    elif isinstance(node, list):
        for child in node:
            _drop_timing(child)


def canonical(payload: dict) -> str:
    """The JSON text that identity hashing uses: volatile provenance removed, keys sorted."""
    clean = json.loads(json.dumps(payload))
    for key in VOLATILE:
        clean["_provenance"].pop(key, None)
    _drop_timing(clean)
    return json.dumps(clean, sort_keys=True, indent=1, ensure_ascii=False) + "\n"


def write_result(
    key: str,
    area: str,
    values: dict,
    *,
    producer: str,
    description: str,
    formats: dict[str, dict] | None = None,
    inputs: list[str] | None = None,
    seed: int = SEED,
) -> Path:
    """Write ``results/<area>/<key>.json`` and register it in ``results/index.json``.

    ``formats`` maps a dotted path inside ``values`` to its display format, e.g.
    ``{"post2019.or": {"decimals": 2}}``; the site and the paper round only through it."""
    payload = {
        "_provenance": {
            "key": key,
            "producer": producer,
            "git_sha": git_sha(),
            "code_dirty": code_dirty(),
            "seed": seed,
            "inputs": input_hashes(inputs or []),
            "created": datetime.now(UTC).isoformat(timespec="seconds"),
        },
        "values": values,
    }
    path = RESULTS_DIR / area / f"{key}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, sort_keys=True, indent=1, ensure_ascii=False, allow_nan=False) + "\n"
    )
    index = json.loads(INDEX.read_text()) if INDEX.exists() else {}
    index[key] = {
        "file": str(path.relative_to(ROOT)),
        "producer": producer,
        "description": description,
        "formats": formats or {},
    }
    INDEX.write_text(json.dumps(index, sort_keys=True, indent=1) + "\n")
    return path


def identity_hash(path: Path) -> str:
    """Hash of a results file ignoring the volatile provenance fields."""
    return hashlib.sha256(canonical(json.loads(path.read_text())).encode()).hexdigest()
