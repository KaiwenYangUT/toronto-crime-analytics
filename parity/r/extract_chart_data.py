"""Pull the plotted data out of the R-built widgets (build/r-work/charts/docs) into
parity/r_outputs/charts/chart_data.json.xz. Standard library only.

For plotly traces the arrays x, y, z, text are kept; long hover-text arrays (more than 200
entries) are kept as {n, sha256}. For the leaflet map the circle-marker latitudes, longitudes and
the popup hash are kept. For the DT table the columns are kept.
Run: python3 -I parity/r/extract_chart_data.py"""

import hashlib
import json
import lzma
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "build" / "r-work" / "charts" / "docs"
OUT = ROOT / "parity" / "r_outputs" / "charts"
BLOCK = re.compile(r'<script type="application/json" data-for="([^"]+)"[^>]*>(.*?)</script>', re.S)


def digest(values) -> dict:
    return {"n": len(values), "sha256": hashlib.sha256("\n".join(map(str, values)).encode()).hexdigest()}


def keep(values):
    return values if isinstance(values, list) and len(values) <= 200 else (digest(values) if isinstance(values, list) else values)


def plotly(x: dict) -> dict:
    traces = []
    for tr in x["data"]:
        item = {"type": tr.get("type"), "name": tr.get("name"), "mode": tr.get("mode")}
        for axis in ("x", "y", "z", "text"):
            if axis in tr:
                item[axis] = keep(tr[axis]) if axis != "y" else tr[axis]
        if tr["type"] == "box":
            pairs: dict[str, int] = {}
            for xv, yv in zip(tr["x"], tr["y"], strict=True):
                key = f"{xv}|{yv}"
                pairs[key] = pairs.get(key, 0) + 1
            item["x"] = digest(tr["x"])
            item["pairs"] = pairs
        traces.append(item)
    title = x.get("layout", {}).get("title")
    return {"kind": "plotly", "title": title if isinstance(title, str) else (title or {}).get("text"), "traces": traces}


def leaflet(x: dict) -> dict:
    markers = next(c for c in x["calls"] if c["method"] == "addCircleMarkers")
    args = markers["args"]
    popups = next(a for a in args if isinstance(a, list) and a and str(a[0]).startswith("Neighbourhood: "))
    return {"kind": "leaflet", "n_markers": len(args[0]), "lat": args[0], "lng": args[1],
            "popup": digest(popups), "popup_sorted": digest(sorted(popups)),
            "set_view": x.get("setView")}


def main() -> None:
    out = {}
    for path in sorted(DOCS.glob("widgets/*.html")) + [DOCS / "variable.html"]:
        for _name, raw in BLOCK.findall(path.read_text(encoding="utf8")):
            x = json.loads(raw)["x"]
            if "calls" in x:
                item = leaflet(x)
            elif "layout" in x:
                item = plotly(x)
            else:
                item = {"kind": "dt", "columns": x["data"]}
            out.setdefault(path.name, []).append(item)
    OUT.mkdir(parents=True, exist_ok=True)
    with lzma.open(OUT / "chart_data.json.xz", "wt", encoding="utf8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print({k: len(v) for k, v in out.items()}, (OUT / "chart_data.json.xz").stat().st_size, "bytes")


if __name__ == "__main__":
    main()
