"""The Vega-Lite theme, built from design/tokens.json. The same JSON config styles the site
charts and the vector figures in the paper, so there is one design system with no restyling."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOKENS_PATH = ROOT / "design" / "tokens.json"


def load_tokens(path: Path = TOKENS_PATH) -> dict:
    return json.loads(path.read_text())


def vega_config(tokens: dict, mode: str, sizes: str = "site") -> dict:
    """Vega-Lite ``config`` for one colour mode. ``sizes`` picks a block of ``tokens["chart"]``:
    "site" for the web charts, "paper" for the pinned sizes the paper's figures were laid out with."""
    c = tokens["color"][mode]
    z = tokens["chart"][sizes]
    font = f"{tokens['type']['font_ui']}, system-ui, sans-serif"
    marks = tokens["mark"]
    cats = [c["category"][k] for k in tokens["category_order"]]
    config = {
        "background": c["bg"],
        "font": font,
        "view": {"stroke": "transparent"},
        "title": {
            "font": font,
            "fontSize": z["title"],
            "fontWeight": 600,
            "color": c["text"],
            "anchor": "start",
            "subtitleFont": font,
            "subtitleFontSize": z["subtitle"],
            "subtitleColor": c["text-muted"],
            "subtitlePadding": 4,
        },
        "axis": {
            "labelFont": font,
            "labelFontSize": z["axis_label"],
            "labelColor": c["text-muted"],
            "titleFont": font,
            "titleFontSize": z["axis_title"],
            "titleFontWeight": 500,
            "titleColor": c["text"],
            "domainColor": c["border"],
            "tickColor": c["border"],
            "gridColor": c["border"],
            "gridOpacity": 0.7,
            "tickSize": 4,
            "labelPadding": 6,
        },
        "legend": {
            "labelFont": font,
            "labelFontSize": z["legend_label"],
            "labelColor": c["text"],
            "titleFont": font,
            "titleFontSize": z["legend_title"],
            "titleColor": c["text-muted"],
            "symbolSize": 90,
            "symbolStrokeWidth": 2,
            "orient": "top",
            "padding": 0,
        },
        "range": {
            "category": cats,
            "ordinal": c["ordinal"],
            "ramp": c["density"],
            "heatmap": c["density"],
        },
        "line": {"strokeWidth": marks["line_width"]},
        "point": {"size": marks["point_size"], "filled": True},
        "bar": {"cornerRadiusEnd": marks["bar_corner_radius"]},
        "rule": {"color": c["text-muted"], "strokeWidth": 1},
        "text": {"font": font, "color": c["text"], "fontSize": z["text"]},
        "style": {
            "accent": {"color": c["accent"]},
            "accentOutline": {"stroke": c["accent"]},
            "muted": {"color": c["text-muted"]},
            "ink": {"color": c["text"]},
        },
    }
    if sizes == "site":  # the paper's pinned config stays exactly as it was
        config["range"]["magnitude"] = c["ramp"]["magnitude"]
    return config


def vega_themes(tokens: dict) -> dict:
    """What design/vega-theme.json holds: the site themes plus ``paper`` (light colours, pinned sizes)."""
    return {
        "light": vega_config(tokens, "light"),
        "dark": vega_config(tokens, "dark"),
        "paper": vega_config(tokens, "light", "paper"),
    }


def category_domain(tokens: dict) -> dict:
    """Category order, labels, colours per mode and marker shapes: the fixed meaning of each hue."""
    order = tokens["category_order"] + ["other"]
    return {
        "keys": order,
        "labels": [tokens["category_labels"][k] for k in order],
        "markers": [tokens["category_markers"][k] for k in order],
        "colors": {
            m: [tokens["color"][m]["category"][k] for k in order] for m in ("light", "dark")
        },
    }
