"""XGBoost grid fix: as-run (caret default) vs as-intended (the original's tune_grid), 2020 split.
Run after the ablation (needs CPU): PYTHONPATH=pipeline/src .venv/bin/python parity/compare/xgb_grid_fix.py"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.predict import jsc370_port as j
from tca.predict.tuning import grid_fix
from tca.results import write_result

if __name__ == "__main__":
    train, test = j.load_r_frames()
    v = grid_fix(train, test)
    write_result(
        "predict.xgb_grid_fix",
        "predict",
        v,
        producer="parity/compare/xgb_grid_fix.py",
        description="JSC370 XGBoost: caret default grid (as run) vs the original's intended tune_grid, on the "
        "original 2020 train/test split; 10-seed means",
        formats={
            "as_run_caret_default.test.f1_mean": {"decimals": 3},
            "as_intended.test.f1_mean": {"decimals": 3},
        },
        inputs=[
            "Auto_Theft_Open_Data.csv",
            "Bicycle_Thefts_Open_Data.csv",
            "Break_and_Enter_Open_Data.csv",
            "Homicides_Open_Data_(ASR-RC-TBL-002).csv",
            "Robbery_Open_Data.csv",
            "Shooting_and_Firearm_Discharges_Open_Data.csv",
            "Theft_Over_Open_Data.csv",
            "Income_Dataset.xlsx",
        ],
    )
    print(
        {k: v[k]["test"] for k in ("as_run_caret_default", "as_intended")}, v["as_intended"]["best"]
    )
