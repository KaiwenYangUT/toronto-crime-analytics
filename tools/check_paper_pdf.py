"""Checks on the built paper: page limit, embedded fonts, searchable text (figures included).
Usage: python tools/check_paper_pdf.py paper/build/paper.pdf [max_pages]"""

import subprocess
import sys

from check_page_count import page_count

REQUIRED_FONTS = ("SourceSerif4-Regular", "Inter-Regular")
FIGURE_TEXT = ("Incidents per year", "Odds ratio", "PR-AUC", "Premises and location type")


def main(pdf: str, limit: int) -> int:
    problems = []
    pages = page_count(pdf)
    if pages > limit:
        problems.append(f"{pages} pages exceeds the limit of {limit}")
    fonts = subprocess.run(["pdffonts", pdf], capture_output=True, text=True, check=True).stdout.splitlines()[2:]
    rows = [line.split() for line in fonts if line.strip()]
    unembedded = [r[0] for r in rows if r[-5] != "yes"]
    problems += [f"font not embedded: {name}" for name in unembedded]
    names = " ".join(r[0] for r in rows)
    problems += [f"font missing: {f}" for f in REQUIRED_FONTS if f not in names]
    text = subprocess.run(["pdftotext", pdf, "-"], capture_output=True, text=True, check=True).stdout
    problems += [f"text not extractable: {t!r}" for t in FIGURE_TEXT if t not in text]
    print(f"{pdf}: {pages} pages (limit {limit}), {len(rows)} font entries")
    for p in problems:
        print("FAIL:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 7))
