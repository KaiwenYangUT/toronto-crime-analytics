"""Solar darkness: NOAA equations against known astronomy for Toronto."""

import pandas as pd
import pytest
from tca.features import solar_darkness, solar_elevation


def elevation(utc: str) -> float:
    return float(solar_elevation(pd.Series([pd.Timestamp(utc)])).iloc[0])


def test_summer_solstice_noon_elevation():
    # solar noon in Toronto on 2023-06-21 is about 17:07 UTC; elevation = 90 - 43.65 + 23.44
    assert elevation("2023-06-21 17:07") == pytest.approx(69.8, abs=0.3)


def test_winter_solstice_noon_elevation():
    assert elevation("2023-12-21 17:12") == pytest.approx(22.9, abs=0.3)


def test_equinox_noon_elevation():
    assert elevation("2023-03-20 17:10") == pytest.approx(90 - 43.65, abs=0.5)


def test_sunrise_on_the_solstice_is_near_0536_local():
    # NOAA gives 05:36 EDT = 09:36 UTC; the horizon (about -0.83 degrees with refraction) is crossed there
    assert elevation("2023-06-21 09:36") == pytest.approx(-0.83, abs=0.9)


def test_midnight_is_dark_and_noon_is_light():
    date = pd.Series([pd.Timestamp("2022-07-01")] * 2)
    dark, _ = solar_darkness(date, pd.Series([0, 12]))
    assert dark.tolist() == [1, 0]


def test_twilight_hours_differ_by_season():
    # 21:30 local is light in June (sun above -6) and dark in December
    june, _ = solar_darkness(pd.Series([pd.Timestamp("2022-06-21")]), pd.Series([21]))
    dec, _ = solar_darkness(pd.Series([pd.Timestamp("2022-12-21")]), pd.Series([21]))
    assert (june.iloc[0], dec.iloc[0]) == (0, 1)


def test_dst_gap_and_repeated_hour_are_counted():
    # 2023-03-12 02:00-03:00 does not exist in Toronto; 2023-11-05 01:00-02:00 happens twice
    dates = pd.Series(
        [pd.Timestamp("2023-03-12"), pd.Timestamp("2023-11-05"), pd.Timestamp("2023-06-01")]
    )
    _, counts = solar_darkness(dates, pd.Series([2, 1, 12]))
    assert counts["spring_forward_hour_rows"] == 1 and counts["fall_back_hour_rows"] == 1
    assert counts["distinct_date_hours"] == 3
