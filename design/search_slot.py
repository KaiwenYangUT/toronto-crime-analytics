"""Sweep one palette slot in OKLCH and keep candidates that pass the dataviz validator.
Usage: python design/search_slot.py MODE SURFACE FIXED_HEXES L_MIN L_MAX [--pairs all]
Standard library only (the validator itself is the skill's node script)."""

import math
import subprocess
import sys

VALIDATOR = sys.argv[6] if len(sys.argv) > 6 else "validate_palette.js"


def oklch_to_hex(L, C, h):
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


mode, surface, fixed, lmin, lmax = sys.argv[1:6]
found = []
L = float(lmin)
while L <= float(lmax) + 1e-9:
    for C in (0.10, 0.13, 0.16):
        for h in range(0, 360, 10):
            hexv = oklch_to_hex(L, C, h)
            if not hexv:
                continue
            r = subprocess.run(
                [
                    "node",
                    VALIDATOR,
                    f"{fixed},{hexv}",
                    "--mode",
                    mode,
                    "--surface",
                    surface,
                    "--pairs",
                    "all",
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            if "[FAIL]" not in r.stdout:
                warn = r.stdout.count("[WARN]")
                found.append((warn, hexv, round(L, 2), C, h))
    L += 0.03
for warn, hexv, L, C, h in sorted(found)[:15]:
    print(hexv, f"L{L} C{C} h{h}", "warns", warn)
print(len(found), "passing candidates")
