"""Generate a synthetic Vega PDF and a fontspec source; no analysis values involved."""

import json
from pathlib import Path

import vl_convert as vlc

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "build/spikes/pdf"
FONTS = ROOT / ".cache/fonts"

OUTPUT.mkdir(parents=True, exist_ok=True)
vlc.register_font_directory(str(FONTS / "inter"))
spec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
    "width": 400,
    "height": 190,
    "title": "Static Inter PDF text probe",
    "data": {"values": [{"group": "Alpha", "value": 2}, {"group": "Beta", "value": 3}]},
    "mark": "bar",
    "encoding": {
        "x": {"field": "group", "type": "nominal", "title": "Category"},
        "y": {"field": "value", "type": "quantitative", "title": "Synthetic count"},
    },
    "config": {
        "font": "Inter",
        "title": {"font": "Inter"},
        "axis": {"labelFont": "Inter", "titleFont": "Inter"},
    },
}
(OUTPUT / "chart.vl.json").write_text(json.dumps(spec, indent=2) + "\n")
(OUTPUT / "chart.pdf").write_bytes(vlc.vegalite_to_pdf(spec))
(OUTPUT / "chart.png").write_bytes(vlc.vegalite_to_png(spec, scale=2))
tex = r"""\documentclass{article}
\special{pdf:minorversion 7}
\usepackage{fontspec}
\usepackage{graphicx}
\setmainfont{SourceSerif4-Regular.otf}[Path=@FONTS@/source-serif/]
\setsansfont{Inter-Regular.otf}[Path=@FONTS@/inter/]
\begin{document}
\section*{Static font compilation probe}
Source Serif 4 body text remains searchable and embeds its font.
\textsf{Inter sans-serif text also embeds its static font.}

\medskip
\noindent\includegraphics[width=\linewidth]{chart.pdf}
\end{document}
"""
(OUTPUT / "font-probe.tex").write_text(tex.replace("@FONTS@", str(FONTS)))
print(f"Generated synthetic PDF/fontspec probe in {OUTPUT}")
