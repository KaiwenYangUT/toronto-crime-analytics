"""Fit every rung under both designs and cache the predictions (resumable; local only).

PYTHONPATH=pipeline/src python -m tca.predict.ablation_run [--fraction 0.1]
"""

from __future__ import annotations

import sys
import time

from tca.predict import ablation as ab

VARIANTS = [
    "L1",
    "L2",
    "L3",
    "L4",
    "L5",
    "L2-nopremises",
    "L3-nopremises",
    "L4-nopremises",
    "L5-nopremises",
]


def main(fraction: float = 1.0) -> None:
    table, log = ab.build_table(fraction)
    tag = "full" if fraction >= 1.0 else f"sample{int(fraction * 100)}"
    print(log, flush=True)
    for design in ("A", "B"):
        for variant in VARIANTS:
            start = time.time()
            preds, info = ab.cached(
                design, variant, table, tag=tag, importance=variant.startswith("L5")
            )
            print(
                f"{design} {variant}: {len(preds)} predictions, {info['seconds']} s (wall {time.time() - start:.0f} s)",
                flush=True,
            )


if __name__ == "__main__":
    main(float(sys.argv[sys.argv.index("--fraction") + 1]) if "--fraction" in sys.argv else 1.0)
