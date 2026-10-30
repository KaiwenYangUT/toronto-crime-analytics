"""Chart checklist: the data behind each original JSC370 chart, from Python, against the arrays
in the widgets the R re-run built (parity/r_outputs/charts/chart_data.json.xz).
Run: .venv/bin/python parity/compare/compare_charts.py"""

import json
import lzma
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.build import jsc370_legacy
from tca.figures import aggregates as agg


def load_r() -> dict:
    with lzma.open(
        ROOT / "parity/r_outputs/charts/chart_data.json.xz", "rt", encoding="utf8"
    ) as fh:
        return json.load(fh)


def compare() -> dict:
    r = load_r()
    # the widget builder drops incomplete rows after the merge
    df = jsc370_legacy(keep_neighbourhood=True, na_omit_before_merge=False)
    out: dict[str, bool | dict] = {}

    f1 = agg.figure1(df)
    t = r["figure1.html"][0]["traces"][0]
    out["figure1"] = {k: t[k] == f1[k] for k in ("x", "y", "z", "text")}

    f2 = agg.figure2(df)
    traces = {t["name"]: t for t in r["figure2.html"][0]["traces"]}
    out["figure2"] = {p: traces[p]["pairs"] == f2[p] for p in f2} | {
        "premises_equal": sorted(traces) == sorted(f2)
    }

    for key in ("season", "month", "day", "hour"):
        f3 = agg.figure3(df, key)
        traces = {t["name"]: t for t in r[f"figure3_{key}.html"][0]["traces"]}
        out[f"figure3_{key}"] = {
            p: traces[p]["x"] == f3[p]["x"] and traces[p]["y"] == f3[p]["y"] for p in f3
        }
        out[f"figure3_{key}"]["premises_equal"] = sorted(traces) == sorted(f3)
        f4 = agg.figure4(df, key)
        total, robbery = r[f"figure4_{key}.html"][0]["traces"]
        out[f"figure4_{key}"] = {
            "x": total["x"] == f4["x"] == robbery["x"],
            "total": total["y"] == f4["total"],
            "robbery": robbery["y"] == f4["robbery"],
            "labels": robbery["text"] == f4["text"],
        }

    f5 = agg.figure5(df)
    m = r["figure5_map.html"][0]
    out["figure5"] = {
        "n_markers": m["n_markers"] == len(f5["lat"]) == 2779,
        "lat": m["lat"] == f5["lat"],
        "lng": m["lng"] == f5["lng"],
        "popup_sorted": m["popup_sorted"] == f5["popup_sorted"],
        "popup_in_order": m["popup"] == f5["popup"],
        "view": m["set_view"][:2] == [[43.7, -79.4], 10],
    }

    v = agg.variable_page(df)
    table, bars = r["variable.html"][0]["columns"], r["variable.html"][1]["traces"]
    out["variable_table"] = {
        s: table[i + 1] == v["table"][s]
        for i, s in enumerate(["Min", "Q1", "Median", "Mean", "Q3", "Max"])
    }
    out["variable_bars"] = {
        name: bars[i]["x"] == v[name]["x"] and bars[i]["y"] == v[name]["y"]
        for i, name in enumerate(["season", "month", "day", "hour"])
    }
    # index.Rmd stat cards, hard-coded in the original text: 16,611 incidents, 16.7% robbery, Moss Park
    n, robberies = len(df), int(df["Robbery"].sum())
    top = df[df["Robbery"]].groupby("Neighbourhood").size().sort_values(ascending=False)
    out["stat_cards"] = {
        "incidents_16611": n == 16_611,
        "robbery_share_16_7": f"{100 * robberies / n:.1f}" == "16.7",
        "top_neighbourhood_moss_park": top.index[0] == "Moss Park" and int(top.iloc[0]) == 135,
        "continuous_variables_9": len(agg.SUMMARY_COLUMNS) == 9,
        "hourly_bins_24": df["Hour"].nunique() == 24,
    }
    return out


def flat(d, prefix=""):
    for k, v in d.items():
        if isinstance(v, dict):
            yield from flat(v, f"{prefix}{k}.")
        else:
            yield f"{prefix}{k}", v


if __name__ == "__main__":
    report = compare()
    checks = dict(flat(report))
    path = ROOT / "parity/reports/charts.json"
    path.write_text(json.dumps(report, indent=1) + "\n")
    bad = [k for k, v in checks.items() if v is not True]
    print(
        f"{len(checks) - len(bad)} of {len(checks)} chart checks equal; wrote {path.relative_to(ROOT)}"
    )
    for k in bad:
        print("DIFFERENT:", k)
    sys.exit(1 if bad else 0)
