"""Build the per-page results JSON the site imports at build time.

Each page file holds the pruned values of the results keys that page uses, their provenance and the
display formats from results/index.json (plus design/display_formats.json, which covers numbers the
producers did not format). Run: python tools/gen_web_data.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "src" / "data" / "pages"

# Per page: results key -> dotted path patterns to keep ("*" matches one segment; a kept node keeps its subtree).
ABLATION_SUMMARY = [
    "designs.*.prevalence",
    "designs.*.rows",
    "designs.*.clusters",
    "designs.*.bootstrap_replicates",
    "designs.*.variants.*.pr_auc",
    "designs.*.variants.*.roc_auc",
    "designs.*.variants.*.f1",
    "designs.*.deltas",
]
PAGES: dict[str, dict[str, list[str] | None]] = {
    "overview": {
        "explain.sta303_v2": [
            "n",
            "robbery",
            "robbery_share",
            "post2019",
            "classes",
            "composition",
            "prevalence_by_year",
            "cv.auc_mean",
            "log.model_rows",
        ],
        "predict.ablation": ABLATION_SUMMARY,
        "predict.inference_vs_prediction": None,
    },
    "explain": {
        "explain.sta303_v2": None,
        "predict.eda_corrections": None,
        "predict.inference_vs_prediction": None,
    },
    "predict": {
        "predict.ablation": None,
        "predict.eda_corrections": ["year", "rows", "robberies"],
        "predict.inference_vs_prediction": None,
        "predict.xgb_grid_fix": None,
        "predict.jsc370_benchmark": None,
    },
    "methods": {
        "explain.sta303_v2": [
            "n",
            "robbery",
            "robbery_share",
            "classes",
            "log",
            "fit.parameters",
            "cv.folds",
            "cv.seed",
        ],
        "predict.ablation": [*ABLATION_SUMMARY, "table", "evaluation"],
        "predict.eda_corrections": ["year", "rows", "robberies"],
        "predict.xgb_grid_fix": [
            "seeds",
            "threshold",
            "as_intended.grid_size",
            "as_run_caret_default.grid_size",
        ],
    },
}


def covers(pattern: list[str], path: list[str]) -> bool:
    """The pattern names this node or one of its ancestors, so the whole subtree is kept."""
    return len(pattern) <= len(path) and all(
        p in ("*", q) for p, q in zip(pattern, path, strict=False)
    )


def leads_to(pattern: list[str], path: list[str]) -> bool:
    """The node is an ancestor of something the pattern names."""
    return len(path) < len(pattern) and all(
        p in ("*", q) for p, q in zip(pattern, path, strict=False)
    )


def prune(node, path: list[str], keep: list[list[str]]):
    if any(covers(p, path) for p in keep):
        return node
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            sub = [*path, str(k)]
            if any(covers(p, sub) or leads_to(p, sub) for p in keep):
                out[k] = prune(v, sub, keep)
        return out
    return None


def load_formats() -> dict[str, dict]:
    index = json.loads((ROOT / "results" / "index.json").read_text())
    formats: dict[str, dict] = {}
    for key, entry in index.items():
        for path, fmt in entry["formats"].items():
            formats[f"{key}:{path}"] = fmt
    extra = ROOT / "design" / "display_formats.json"
    if extra.exists():
        for pattern, fmt in json.loads(extra.read_text()).items():
            if not pattern.startswith("_"):
                formats[pattern] = fmt
    return formats


def write_explore_places() -> None:
    """Destinations and stations with exact float64 coordinates (from the hex doubles the R rebuild wrote)."""
    import csv

    def rows(name: str) -> list[dict]:
        path = ROOT / "parity" / "r_outputs" / "explorer" / name
        with path.open() as f:
            return [
                {
                    "id": r["id"],
                    "name": r["name"],
                    **({"type": r["type"]} if "type" in r else {}),
                    "lon": float.fromhex(r["longitude_hex"]),
                    "lat": float.fromhex(r["latitude_hex"]),
                }
                for r in csv.DictReader(f)
            ]

    data = {"places": rows("places_hex.csv"), "stations": rows("stations_hex.csv")}
    (OUT.parent / "explore-places.json").write_text(json.dumps(data, indent=1) + "\n")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    write_explore_places()
    formats = load_formats()
    for page, keys in PAGES.items():
        results = {}
        for key, patterns in keys.items():
            doc = json.loads((ROOT / "results" / key.split(".")[0] / f"{key}.json").read_text())
            values = doc["values"]
            if patterns is not None:
                values = prune(values, [], [p.split(".") for p in patterns])
            prov = doc["_provenance"]
            results[key] = {
                "producer": prov["producer"],
                "git_sha": prov["git_sha"],
                "created": prov["created"],
                "values": values,
            }
        page_formats = {p: f for p, f in formats.items() if p.split(":")[0] in keys}
        text = json.dumps({"results": results, "formats": page_formats}, separators=(",", ":"))
        (OUT / f"{page}.json").write_text(text + "\n")
        print(f"{page}: {len(text) / 1024:.0f} KB raw, {len(results)} keys")


if __name__ == "__main__":
    main()
