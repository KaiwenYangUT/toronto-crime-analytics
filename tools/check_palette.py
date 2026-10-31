"""Palette checks for design/tokens.json (standard library only).

A port of the dataviz skill's validate_palette.js: OKLCH lightness band, chroma floor,
colour-vision-deficiency separation (Machado et al. 2009, severity 1.0, OKLab delta E x 100),
the normal-vision floor and WCAG contrast. Neutral tokens are checked for text contrast.

Run: python tools/check_palette.py            # checks tokens.json, writes design/palette-validation.md
"""

from __future__ import annotations

import json
import math
import sys
from itertools import combinations, pairwise
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BAND = {"light": (0.43, 0.77), "dark": (0.48, 0.67)}
CHROMA_FLOOR = 0.10
CVD_TARGET, CVD_FLOOR, NORMAL_FLOOR, CONTRAST_MIN = 8.0, 6.0, 15.0, 3.0
ORDINAL_MIN_DL, ORDINAL_LIGHT_FLOOR = 0.06, 2.0
MACHADO = {
    "protan": [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998],
    ],
    "deutan": [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.011820, 0.042940, 0.968881],
    ],
    "tritan": [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.303900],
    ],
}


def _srgb(h: str) -> list[float]:
    h = h.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]


def _linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin(h: str) -> list[float]:
    return [_linear(c) for c in _srgb(h)]


def luminance(h: str) -> float:
    r, g, b = lin(h)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def oklab_from_linear(rgb: list[float]) -> tuple[float, float, float]:
    r, g, b = rgb
    l_ = math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m_ = math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s_ = math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def oklch(h: str) -> tuple[float, float]:
    L, a, b = oklab_from_linear(lin(h))
    return L, math.hypot(a, b)


def simulate(h: str, kind: str) -> list[float]:
    r, g, b = lin(h)
    return [min(max(row[0] * r + row[1] * g + row[2] * b, 0.0), 1.0) for row in MACHADO[kind]]


def delta_e(h1: str, h2: str, kind: str | None = None) -> float:
    a = oklab_from_linear(simulate(h1, kind) if kind else lin(h1))
    b = oklab_from_linear(simulate(h2, kind) if kind else lin(h2))
    return 100 * math.dist(a, b)


def check_categorical(colors: list[str], mode: str, surface: str) -> list[tuple[str, str, str]]:
    """Rows of (check, status, detail). status is PASS, WARN or FAIL. All pairs are compared
    because the categories appear together on the map and in small multiples."""
    lo, hi = BAND[mode]
    rows = []
    off = [(c, round(oklch(c)[0], 3)) for c in colors if not lo <= oklch(c)[0] <= hi]
    rows.append(
        (
            "Lightness band",
            "FAIL" if off else "PASS",
            f"outside L {lo}-{hi}: {off}" if off else f"all inside L {lo}-{hi}",
        )
    )
    low = [(c, round(oklch(c)[1], 3)) for c in colors if oklch(c)[1] < CHROMA_FLOOR]
    rows.append(
        (
            "Chroma floor",
            "FAIL" if low else "PASS",
            f"below {CHROMA_FLOOR}: {low}" if low else f"all >= {CHROMA_FLOOR}",
        )
    )
    pairs = list(combinations(colors, 2))
    worst = min(((delta_e(a, b, k), k, a, b) for k in ("protan", "deutan") for a, b in pairs))
    tritan = min(delta_e(a, b, "tritan") for a, b in pairs)
    state = "PASS" if worst[0] >= CVD_TARGET else "WARN" if worst[0] >= CVD_FLOOR else "FAIL"
    rows.append(
        (
            "CVD separation",
            state,
            f"worst all-pairs {worst[2]}-{worst[3]} dE {worst[0]:.1f} ({worst[1]}); tritan {tritan:.1f}",
        )
    )
    normal = min((delta_e(a, b), a, b) for a, b in pairs)
    rows.append(
        (
            "Normal-vision floor",
            "PASS" if normal[0] >= NORMAL_FLOOR else "FAIL",
            f"worst all-pairs {normal[1]}-{normal[2]} dE {normal[0]:.1f}",
        )
    )
    weak = [
        (c, round(contrast(c, surface), 2)) for c in colors if contrast(c, surface) < CONTRAST_MIN
    ]
    rows.append(
        (
            "Contrast vs surface",
            "WARN" if weak else "PASS",
            f"below 3:1 (needs labels or a table): {weak}" if weak else "all >= 3:1",
        )
    )
    return rows


def check_ordinal(steps: list[str], mode: str, surface: str) -> list[tuple[str, str, str]]:
    """Steps run from least to most emphasised: light to dark on a light surface, dark to light on a dark one."""
    lightness = [oklch(c)[0] for c in steps]
    seq = lightness if mode == "light" else lightness[::-1]  # light-to-dark reading order
    rows = [
        (
            "Lightness monotone",
            "PASS" if all(a > b for a, b in pairwise(seq)) else "FAIL",
            "steps read light to dark",
        )
    ]
    gaps = [abs(a - b) for a, b in pairwise(lightness)]
    rows.append(
        (
            "Adjacent dL",
            "PASS" if min(gaps) >= ORDINAL_MIN_DL else "FAIL",
            f"min gap {min(gaps):.3f}",
        )
    )
    faint = steps[0]
    weakest = min(steps, key=lambda c: contrast(c, surface))
    rows.append(
        (
            "Weakest step vs surface",
            "PASS" if contrast(weakest, surface) >= ORDINAL_LIGHT_FLOOR else "FAIL",
            f"{weakest} at {contrast(weakest, surface):.2f}:1 (faint end {faint})",
        )
    )
    hues = [
        math.degrees(math.atan2(oklab_from_linear(lin(c))[2], oklab_from_linear(lin(c))[1])) % 360
        for c in steps
    ]
    spread = max(hues) - min(hues)
    rows.append(("Single hue", "PASS" if spread <= 15 else "FAIL", f"hue spread {spread:.0f} deg"))
    return rows


def check_magnitude(steps: list[str], mode: str, surface: str) -> list[tuple[str, str, str]]:
    """The viridis magnitude ramp (counts on a background), ordered low to high. It is multi-hue by
    design (perceptually uniform, colour-vision safe), so the single-hue test does not apply. The low
    end is the faint one: light on white (or dark on a dark ground) falls under 3:1 and so needs the
    mandatory relief: value labels or the data-table view."""
    lightness = [oklch(c)[0] for c in steps]
    # low to high reads light to dark on a light surface, dark to light on a dark one
    seq = lightness if mode == "light" else lightness[::-1]
    gaps = [abs(a - b) for a, b in pairwise(lightness)]
    low, high = steps[0], steps[-1]
    ends = {k: delta_e(low, high, k) for k in (None, "protan", "deutan", "tritan")}
    worst = min(ends.values())
    rows = [
        (
            "Lightness monotone",
            "PASS" if all(a > b for a, b in pairwise(seq)) else "FAIL",
            "steps read low to high without reversing",
        ),
        (
            "Adjacent dL",
            "PASS" if min(gaps) >= ORDINAL_MIN_DL else "FAIL",
            f"min gap {min(gaps):.3f} over {len(steps)} stops",
        ),
        (
            "End stops, colour-vision separation",
            "PASS" if worst >= CVD_TARGET else "FAIL",
            (
                f"{low}-{high} dE {ends[None]:.1f} normal, protan {ends['protan']:.1f}, "
                f"deutan {ends['deutan']:.1f}, tritan {ends['tritan']:.1f}"
            ),
        ),
    ]
    c_low, c_high = contrast(low, surface), contrast(high, surface)
    rows.append(
        (
            "High end vs bg",
            "PASS" if c_high >= CONTRAST_MIN else "FAIL",
            f"{high} at {c_high:.2f}:1 (need 3:1)",
        )
    )
    rows.append(
        (
            "Low end vs bg",
            "PASS" if c_low >= CONTRAST_MIN else "WARN",
            f"{low} at {c_low:.2f}:1"
            + (
                ""
                if c_low >= CONTRAST_MIN
                else " (below 3:1: cells need a border, value labels or the data table)"
            ),
        )
    )
    hues = [
        math.degrees(math.atan2(oklab_from_linear(lin(c))[2], oklab_from_linear(lin(c))[1])) % 360
        for c in steps
    ]
    rows.append(
        (
            "Single hue",
            "PASS",
            f"not applicable: viridis spans {max(hues) - min(hues):.0f} deg of hue by design",
        )
    )
    return rows


def check_neutrals(tokens: dict, mode: str) -> list[tuple[str, str, str]]:
    c = tokens["color"][mode]
    rows = []
    for name, need in (("text", 7.0), ("text-muted", 4.5), ("accent", 4.5)):
        for ground in ("bg", "surface"):
            ratio = contrast(c[name], c[ground])
            rows.append(
                (
                    f"{name} on {ground}",
                    "PASS" if ratio >= need else "FAIL",
                    f"{ratio:.2f}:1 (need {need}:1)",
                )
            )
    for ground in ("bg", "surface"):
        ratio = contrast(c["accent"], c[ground])
        rows.append(
            (
                f"focus ring on {ground}",
                "PASS" if ratio >= 3.0 else "FAIL",
                f"{ratio:.2f}:1 (need 3:1)",
            )
        )
    other = contrast(c["category"]["other"], c["bg"])
    rows.append(
        (
            "pooled 'other' on bg",
            "PASS" if other >= 3.0 else "FAIL",
            f"{other:.2f}:1 (neutral grey, exempt from the chroma floor)",
        )
    )
    return rows


def run(tokens: dict) -> dict[str, list[tuple[str, str, str]]]:
    report: dict[str, list[tuple[str, str, str]]] = {}
    for mode in ("light", "dark"):
        c = tokens["color"][mode]
        cats = [c["category"][k] for k in tokens["category_order"]]
        report[f"{mode}: categorical (5 categories, all pairs)"] = check_categorical(
            cats, mode, c["bg"]
        )
        report[f"{mode}: ordinal ramp"] = check_ordinal(c["ordinal"], mode, c["bg"])
        report[f"{mode}: magnitude ramp (viridis, low to high)"] = check_magnitude(
            c["ramp"]["magnitude"], mode, c["bg"]
        )
        report[f"{mode}: neutral tokens"] = check_neutrals(tokens, mode)
    return report


def to_markdown(report: dict[str, list[tuple[str, str, str]]]) -> str:
    out = [
        "# Palette validation",
        "",
        "Generated by `tools/check_palette.py` from `design/tokens.json`. Do not edit by hand.",
        "",
    ]
    for title, rows in report.items():
        out += [f"## {title}", "", "| Check | Result | Detail |", "|---|---|---|"]
        out += [f"| {a} | {b} | {c} |" for a, b, c in rows]
        out.append("")
    warns = [t for t, rows in report.items() if any(r[1] == "WARN" for r in rows)]
    out += [
        "## Reading the warnings",
        "",
        (
            "A CVD result in the 6-8 band or a contrast below 3:1 is legal only with secondary encoding. "
            "Every chart therefore pairs colour with a marker shape (`category_markers` in tokens.json), a direct label "
            "or a legend, and a data-table view; colour is never the only channel."
        ),
        "",
        (
            "The magnitude ramp is viridis (user decision, P10). The dataviz skill's `validate_palette.js --ordinal` "
            "reports its two ordinal-only checks as FAIL for it: single hue (viridis is multi-hue on purpose, which is "
            "what makes it perceptually uniform and colour-vision safe) and light-end contrast (the low end sits close "
            "to the background by design: it means near-zero). Lightness is monotone with gaps of at least 0.06 and the "
            "end stops are 70 apart in OKLab dE for every vision type. The low end is therefore always paired with value "
            "labels or the data-table view, and heat-map cells get a thin border in the border colour."
        ),
        "",
        f"Sections with warnings: {', '.join(warns) if warns else 'none'}.",
        "",
    ]
    return "\n".join(out)


def main() -> int:
    tokens = json.loads((ROOT / "design" / "tokens.json").read_text())
    report = run(tokens)
    (ROOT / "design" / "palette-validation.md").write_text(to_markdown(report))
    failed = [(t, r) for t, rows in report.items() for r in rows if r[1] == "FAIL"]
    for t, rows in report.items():
        print(t)
        for a, b, c in rows:
            print(f"  [{b}] {a}: {c}")
    print("FAILED" if failed else "ALL CHECKS PASS (warnings need secondary encoding)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
