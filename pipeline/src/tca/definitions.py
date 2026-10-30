"""The task definition and every named constant the pipeline shares (PLAN.md section 2).

Task: given that a major property-type crime was reported, which type is it?
That is P(robbery | reported MCI incident). It is not robbery risk at a place or time,
which would need exposure data.
"""

from __future__ import annotations

from datetime import date

# One seed, passed explicitly to every RNG. Same value as the R Explorer fixtures.
SEED = 303313

TASK_FRAMING = "Given that a major property-type crime was reported, which type is it?"

POSITIVE = "Robbery"
NEGATIVES = ("Auto Theft", "Break and Enter", "Theft Over")
CLASSES = (POSITIVE, *NEGATIVES)

# Excluded by explicit rule (reason shown in Methods and the paper).
EXCLUDED = {
    "Assault": "an MCI, but not a property crime and not in the inputs",
    "Bicycle theft": "not in the MCI files; dropped by rule, not through missing values",
    "Homicide": "not in the MCI files; dropped by rule",
    "Shooting": "not in the MCI files; dropped by rule",
}

# Unified window: occurrence year (reporting starts in 2014).
YEAR_MIN, YEAR_MAX = 2014, 2023

# Validity box for coordinates (a plausibility box, not a municipal boundary test).
LON_RANGE = (-80.0, -78.0)
LAT_RANGE = (43.0, 45.0)
NSA = "NSA"  # TPS code for "not a neighbourhood"

# Legacy windows, kept by the faithful builders.
EXPLORE_START = date(2020, 1, 1)
JSC370_YEAR = 2020

# Raw input files: key -> (file name, source category label used by the originals).
RAW_FILES = {
    "auto_theft": "Auto_Theft_Open_Data.csv",
    "bicycle": "Bicycle_Thefts_Open_Data.csv",
    "break_enter": "Break_and_Enter_Open_Data.csv",
    "homicide": "Homicides_Open_Data_(ASR-RC-TBL-002).csv",
    "robbery": "Robbery_Open_Data.csv",
    "shooting": "Shooting_and_Firearm_Discharges_Open_Data.csv",
    "theft_over": "Theft_Over_Open_Data.csv",
}
# JSC370 and STA303 read the seven MCI-style files in this order (it fixes bind_rows order).
LEGACY_ORDER = (
    "auto_theft",
    "bicycle",
    "break_enter",
    "homicide",
    "robbery",
    "shooting",
    "theft_over",
)
CENSUS_FILE = "Income_Dataset.xlsx"

# Explorer: three categories first (parity), others added after parity passes.
EXPLORE_SPEC = {
    "bicycle": "Bicycle theft",
    "robbery": "Robbery",
    "theft_over": "Theft over",
}
# Explore v2 adds two categories under the same rules; they load only when switched on.
EXPLORE_SPEC_V2 = {
    "auto_theft": "Auto theft",
    "break_enter": "Break and enter",
}
