"""Honesty audit: every numeral on the built site and in the paper PDF must be a result value shown in its
stored display format (or an allowed non-result numeral). Run after `make web paper`:

    python tools/audit_numbers.py            # exits 1 if any numeral is unmatched

Sources: the prerendered HTML in web/build/client (text outside svg, script, style and code, so chart tick labels
and result-key names are skipped) and `pdftotext` of the paper (references and chart text excluded by the
allowlist). Matching is on the formatted string, so a number shown with different rounding than its stored
format is reported. This catches stray or mis-rounded numerals, but a stray numeral that happens to equal
some other result's text still passes; wording that implies risk or causality still
needs the manual pass. Justified exceptions live in tools/audit_allowlist.json with a reason each.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gen_paper as gp

ROOT = gp.ROOT
SITE = ROOT / "web" / "build" / "client"
PDF = ROOT / "paper" / "build" / "paper.pdf"
ALLOWLIST = json.loads((ROOT / "tools" / "audit_allowlist.json").read_text())

TOKEN = re.compile(r"(?<![\w.])(?:(?<=[\s(\[])[-−])?\d[\d,]*(?:\.\d+)?%?(?![\w])")
LABELLED = re.compile(
    r"\b(?:Figure|Fig\.|Table|Section|Step)\s*~?\d+(?:\.\d+)?|§\s*\d+|\bP[0-9]\b|\bQ[0-9]\b"
)
BLOCK_TAGS = {
    "br",
    "p",
    "li",
    "tr",
    "td",
    "th",
    "dt",
    "dd",
    "div",
    "h1",
    "h2",
    "h3",
    "section",
    "figcaption",
}
SKIP_TAGS = {"svg", "script", "style", "code", "title", "noscript"}
# Result subtrees that never render as prose: 158 small integers would let almost any small numeral pass.
# The census points render only in the chart SVG and the click-only table (which the audit does not read).
SKIP_REFS = {"predict.census_scatter:points"}


def normal(s: str) -> str:
    return s.replace("−", "-").rstrip(".,")


def result_strings() -> set[str]:
    """Every result leaf in its stored display format."""
    out: set[str] = set()

    def walk(node: object, ref: str) -> None:
        if ref in SKIP_REFS:
            return
        if isinstance(node, dict):
            for k, v in node.items():
                if not k.startswith("_"):
                    walk(v, f"{ref}.{k}" if ":" in ref else f"{ref}:{k}")
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{ref}.{i}")
        elif isinstance(node, int | float) and not isinstance(node, bool):
            try:
                out.add(normal(gp.fmt(ref)))
            except KeyError:
                pass

    for key, values in gp.RESULTS.items():
        walk(values, key)
    return out


class Text(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.depth: list[str] = []
        self.chunks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag in BLOCK_TAGS:
            self.chunks.append("\n")
        if tag in SKIP_TAGS:
            self.depth.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th", "dt", "dd"):
            self.chunks.append("\n")
        if self.depth and tag == self.depth[-1]:
            self.depth.pop()

    def handle_data(self, data: str) -> None:
        if not self.depth:
            self.chunks.append(data)


def site_texts() -> dict[str, str]:
    texts = {}
    for page in sorted(SITE.rglob("index.html")):
        parser = Text()
        parser.feed(page.read_text())
        # the footer's build id is a git hash, not a published number (an all-digit hash would be flagged)
        text = re.sub(r"Build [0-9a-f]{7,40}", "Build", "".join(parser.chunks))
        texts[page.parent.relative_to(SITE).as_posix()] = text
    return texts


def cut_references(text: str) -> str:
    """Drop the bibliography: the first page (form-feed separated) that starts with "References" and
    every page after it. After a \\clearpage the heading follows a form feed, not a newline. Without
    such a page, cut at the last "References" heading line."""
    pages = text.split("\f")
    for i, page in enumerate(pages):
        if page.lstrip().startswith("References"):
            return "\f".join(pages[:i])
    cut = text.rfind("\nReferences")
    return text[:cut] if cut > 0 else text


def paper_text() -> str:
    text = subprocess.run(
        ["pdftotext", str(PDF), "-"], capture_output=True, text=True, check=True
    ).stdout
    text = cut_references(text)
    pages = []
    for number, page in enumerate(text.split("\f"), 1):
        rows = page.rstrip().splitlines()
        if rows and rows[-1].strip() == str(number):  # the page number, and only that
            rows = rows[:-1]
        pages += rows
    lines = pages
    lines = [re.sub(r"^\d+(?:\.\d+)*\s+(?=[A-Z])", "", ln) for ln in lines]  # section numbers
    return "\n".join(lines)


def allowed(token: str, source: str) -> str | None:
    t = normal(token)
    if re.fullmatch(r"(?:(?:19|20)\d\d)+", t):
        return "year (axis labels of consecutive years may be joined by the text extraction)"
    for rule in ALLOWLIST["tokens"]:
        if t in rule["values"] and source in rule["in"]:
            return rule["reason"]
    return None


def audit(texts: dict[str, str], known: set[str], source: str) -> list[tuple[str, str, str]]:
    bad = []
    for name, text in texts.items():
        text = LABELLED.sub(" ", text)
        text = re.sub(r"\b\d{1,2}:\d{2}\b", " ", text)  # clock labels
        for m in TOKEN.finditer(text):
            tok = normal(m.group(0))
            if tok in known or allowed(tok, source):
                continue
            ctx = re.sub(r"\s+", " ", text[max(0, m.start() - 40) : m.end() + 30])
            bad.append((name, tok, ctx))
    return bad


def main() -> int:
    known = result_strings()
    print(f"{len(known)} distinct formatted result values")
    problems = []
    if not SITE.exists():
        print("web/build/client missing: run `make web` first")
        return 2
    problems += [("site", *b) for b in audit(site_texts(), known, "site")]
    if PDF.exists():
        problems += [("paper", *b) for b in audit({"paper.pdf": paper_text()}, known, "paper")]
    else:
        print("paper/build/paper.pdf missing: run `make paper` first")
        return 2
    report = ROOT / "reviews" / "audit_numbers.txt"
    report.parent.mkdir(exist_ok=True)
    lines = [f"{src}:{page}: {tok!r} ... {ctx}" for src, page, tok, ctx in problems]
    report.write_text("\n".join(lines) + ("\n" if lines else ""))
    for line in lines[:60]:
        print(line)
    print(
        f"audit_numbers: {len(problems)} unmatched numerals"
        + (f" (see {report.relative_to(ROOT)})" if problems else "")
    )
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
