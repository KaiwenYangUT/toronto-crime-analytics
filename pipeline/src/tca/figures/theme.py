"""The Vega-Lite theme, built from design/tokens.json. The same JSON config styles the site
charts and the vector figures in the paper, so there is one design system with no restyling."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOKENS_PATH = ROOT / "design" / "tokens.json"


def load_tokens(path: Path = TOKENS_PATH) -> dict:
    return json.loads(path.read_text())


def vega_config(tokens: dict, mode: str) -> dict:
    """Vega-Lite ``config`` for one colour mode."""
    c = tokens["color"][mode]
    scale = tokens["type"]["scale"]
    font = f"{tokens['type']['font_ui']}, system-ui, sans-serif"
    marks = tokens["mark"]
    cats = [c["category"][k] for k in tokens["category_order"]]
    return {
        "background": c["bg"],
        "font": font,
        "view": {"stroke": "transparent"},
        "title": {
            "font": font,
            "fontSize": scale["lg"]["size"],
            "fontWeight": 600,
            "color": c["text"],
            "anchor": "start",
            "subtitleFont": font,
            "subtitleFontSize": scale["sm"]["size"],
            "subtitleColor": c["text-muted"],
            "subtitlePadding": 4,
        },
        "axis": {
            "labelFont": font,
            "labelFontSize": scale["xs"]["size"],
            "labelColor": c["text-muted"],
            "titleFont": font,
            "titleFontSize": scale["sm"]["size"],
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
            "labelFontSize": scale["sm"]["size"],
            "labelColor": c["text"],
            "titleFont": font,
            "titleFontSize": scale["sm"]["size"],
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
        "text": {"font": font, "color": c["text"], "fontSize": scale["xs"]["size"]},
        "style": {
            "accent": {"color": c["accent"]},
            "accentOutline": {"stroke": c["accent"]},
            "muted": {"color": c["text-muted"]},
            "ink": {"color": c["text"]},
        },
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
