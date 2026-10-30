"""Write results/CHECKSUMS.sha256: one identity hash per results file (created and git_sha
ignored), so two runs on the same machine can be compared. Run: python tools/hash_outputs.py"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.results import RESULTS_DIR, identity_hash


def main() -> None:
    lines = [
        f"{identity_hash(p)}  {p.relative_to(RESULTS_DIR)}"
        for p in sorted(RESULTS_DIR.rglob("*.json"))
        if p.name != "index.json"
    ]
    (RESULTS_DIR / "CHECKSUMS.sha256").write_text("\n".join(lines) + "\n")
    print(f"hashed {len(lines)} results files")


if __name__ == "__main__":
    main()
