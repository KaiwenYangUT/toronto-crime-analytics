"""Check the paper's page budget: python tools/check_page_count.py paper/build/paper.pdf [max_content]

Content pages are the pages before the first page whose text begins with "References".
The References page itself and anything after it do not count, so total pages are not limited.
The check fails above the limit (default 7), warns above 6, and fails when no References page
exists (a missing \\clearpage before the bibliography)."""

import re
import subprocess
import sys

WARN_ABOVE = 6


def page_count(pdf: str) -> int:
    info = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True, check=True).stdout
    return int(re.search(r"^Pages:\s+(\d+)", info, re.MULTILINE).group(1))


def page_text(pdf: str, page: int) -> str:
    return subprocess.run(
        ["pdftotext", "-f", str(page), "-l", str(page), pdf, "-"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout


def references_page(pdf: str) -> int | None:
    """1-based number of the first page whose text begins with "References", or None."""
    for i in range(1, page_count(pdf) + 1):
        if page_text(pdf, i).lstrip().startswith("References"):
            return i
    return None


def check(pdf: str, limit: int = 7) -> tuple[list[str], list[str]]:
    """Return (problems, notes). Any problem fails the check; notes (incl. warnings) do not."""
    total = page_count(pdf)
    ref = references_page(pdf)
    if ref is None:
        return [
            f"no page begins with 'References' in {total} pages (is there a \\clearpage before the bibliography?)"
        ], []
    content = ref - 1
    notes = [
        f"{pdf}: {content} content pages + references ({total} pages total, content limit {limit})"
    ]
    problems = []
    if content > limit:
        problems.append(f"{content} content pages exceeds the limit of {limit}")
    elif content > WARN_ABOVE:
        notes.append(f"WARN: {content} content pages, over the {WARN_ABOVE}-page target")
    return problems, notes


if __name__ == "__main__":
    probs, notes = check(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 7)
    print("\n".join(notes + [f"FAIL: {p}" for p in probs]))
    sys.exit(1 if probs else 0)
