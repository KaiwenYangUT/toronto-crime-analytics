"""Run with a Python containing pypdf (the bundled PDF runtime is sufficient)."""

import json
import sys
from pathlib import Path

from pypdf import PdfReader


def inspect(path: str) -> dict:
    reader = PdfReader(path)
    fonts = {}

    def resources(dictionary):
        for item in dictionary.get("/Font", {}).values():
            font = item.get_object()
            descendants = font.get("/DescendantFonts", [font])
            for descendant in descendants:
                descendant = descendant.get_object()
                descriptor = descendant.get("/FontDescriptor", {}).get_object()
                name = str(descendant.get("/BaseFont", "unknown"))
                fonts[name] = any(
                    key in descriptor for key in ("/FontFile", "/FontFile2", "/FontFile3")
                )
        for item in dictionary.get("/XObject", {}).values():
            child = item.get_object()
            if "/Resources" in child:
                resources(child["/Resources"])

    for page in reader.pages:
        resources(page["/Resources"])
    text = "\n".join(page.extract_text() for page in reader.pages)
    result = {"file": Path(path).name, "pages": len(reader.pages), "fonts": fonts, "text": text}
    assert fonts and all(fonts.values()), "All fonts must be embedded"
    assert "Static" in text and "Alpha" in text and "Beta" in text, "Text must stay searchable"
    return result


print(json.dumps([inspect(path) for path in sys.argv[1:]], indent=2))
