"""Regenerate RESULTS.md from results/index.json. Run: python tools/gen_results_md.py"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADER = """# RESULTS

The registry of every output file whose numbers may appear on the site or in the paper (AGENTS.md rule 3).
- `results/index.json` is the machine-readable version. This file is generated from it by `tools/gen_results_md.py`.
- A number that isn't traceable to a key below must not be published.

Each results file carries a provenance header: `{key, producer, git_sha, inputs: {file: sha256}, seed, created}`.
Identity hashes (ignoring `created` and `git_sha`) are in `results/CHECKSUMS.sha256`.

| key | file | producer | description | display formats |
|---|---|---|---|---|
"""


def main() -> None:
    index = json.loads((ROOT / "results" / "index.json").read_text())
    rows = []
    for key, e in sorted(index.items()):
        formats = ", ".join(f"`{path}`: {fmt}" for path, fmt in e["formats"].items()) or "none"
        rows.append(
            f"| `{key}` | `{e['file']}` | `{e['producer']}` | {e['description']} | {formats} |"
        )
    (ROOT / "RESULTS.md").write_text(HEADER + "\n".join(rows) + "\n")
    print(f"RESULTS.md: {len(rows)} entries")


if __name__ == "__main__":
    main()
