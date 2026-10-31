"""Lint: no literal numerals in paper/sections/*.tex except years, rung names (L0 to L5), citation keys,
cross-references and single-digit indices inside maths. Every other number goes through \\res (AGENTS.md rule 3)."""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = [
    r"\\(?:cite[a-z]*|citep|citet|citealt|ref|label|eqref|url|includegraphics|input)\*?(?:\[[^\]]*\])*\{[^}]*\}",
    r"\\res[GABI]?\{[^}]*\}",
    r"\b(?:19|20)\d\d\b",
    r"\bL[0-5]\b",
    r"\bF1\b",
    r"\b\d{2}:00\b",  # clock-hour labels of the hour terms
    r"\\textbf\{L[0-5]\}",
]


def strip_math(line: str) -> tuple[str, list[str]]:
    math = re.findall(r"\$[^$]*\$", line)
    return re.sub(r"\$[^$]*\$", " ", line), math


def main() -> int:
    bad = 0
    for path in sorted((ROOT / "paper" / "sections").glob("*.tex")):
        for no, raw in enumerate(path.read_text().splitlines(), 1):
            line = re.sub(r"(?<!\\)%.*", "", raw)
            for pat in ALLOWED:
                line = re.sub(pat, " ", line)
            text, math = strip_math(line)
            hits = re.findall(r"\d[\d.,]*", text) + [
                m for m in re.findall(r"\d+(?:\.\d+)?", " ".join(math)) if len(m) > 1
            ]
            if hits:
                bad += 1
                print(f"{path.relative_to(ROOT)}:{no}: literal numeral {hits}: {raw.strip()[:90]}")
    print("paper numerals lint:", "FAILED" if bad else "ok")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
