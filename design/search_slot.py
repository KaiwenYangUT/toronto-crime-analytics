"""Sweep one palette slot in OKLCH and keep candidates that pass tools/check_palette.py.

Usage: python design/search_slot.py MODE SURFACE FIXED_HEXES L_MIN L_MAX
Example (the dark-mode bicycle slot, with the other four colours fixed):
  python design/search_slot.py dark "#0F1216" "#D55E00,#0072B2,#009E73,#B87EB3" 0.50 0.67
Standard library plus the in-repo checker; this is how the colours in tokens.json were found."""

import importlib.util
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("check_palette", ROOT / "tools" / "check_palette.py")
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


def oklch_to_hex(L: float, C: float, h: float) -> str | None:
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    rgb = [
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    ]
    if any(c < -0.001 or c > 1.001 for c in rgb):
        return None
    out = []
    for c in rgb:
        c = min(max(c, 0), 1)
        c = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        out.append(round(c * 255))
    return "#{:02X}{:02X}{:02X}".format(*out)


def main(mode: str, surface: str, fixed: str, lmin: str, lmax: str) -> None:
    base = fixed.split(",")
    found = []
    L = float(lmin)
    while L <= float(lmax) + 1e-9:
        for C in (0.10, 0.13, 0.16):
            for h in range(0, 360, 10):
                hex_value = oklch_to_hex(L, C, h)
                if not hex_value:
                    continue
                rows = check.check_categorical([*base, hex_value], mode, surface)
                if all(status != "FAIL" for _, status, _ in rows):
                    warnings = sum(status == "WARN" for _, status, _ in rows)
                    found.append((warnings, hex_value, round(L, 2), C, h))
        L += 0.03
    for warnings, hex_value, L, C, h in sorted(found)[:15]:
        print(hex_value, f"L{L} C{C} h{h}", "warnings", warnings)
    print(len(found), "passing candidates")


if __name__ == "__main__":
    main(*sys.argv[1:6])
