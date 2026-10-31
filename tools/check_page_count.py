"""Fail if a PDF has more than the allowed number of pages: python tools/check_page_count.py paper/build/paper.pdf [max]"""

import re
import subprocess
import sys


def page_count(pdf: str) -> int:
    info = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True, check=True).stdout
    return int(re.search(r"^Pages:\s+(\d+)", info, re.M).group(1))


if __name__ == "__main__":
    pdf, limit = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 7
    pages = page_count(pdf)
    print(f"{pdf}: {pages} pages (limit {limit})")
    sys.exit(0 if pages <= limit else 1)
