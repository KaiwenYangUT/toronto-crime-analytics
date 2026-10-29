"""Pandera schemas for every table the pipeline builds. They check structure and value ranges,
not parity (parity is checked against the R exports in ``parity/compare``)."""

from __future__ import annotations

import pandera.pandas as pa

from tca.definitions import CLASSES, LAT_RANGE, LON_RANGE, YEAR_MAX, YEAR_MIN

_lon = pa.Column(float, pa.Check.in_range(*LON_RANGE, include_min=False, include_max=False))
_lat = pa.Column(float, pa.Check.in_range(*LAT_RANGE, include_min=False, include_max=False))
_hour = pa.Column(int, pa.Check.isin(range(24)))
_text = pa.Column(object, nullable=False)

UNIFIED = pa.DataFrameSchema(
    {
        "event_id": pa.Column(object, pa.Check.str_startswith("GO-")),
        "category": pa.Column(str, pa.Check.isin(CLASSES)),
        "robbery": pa.Column("int8", pa.Check.isin([0, 1])),
        "date": pa.Column("datetime64[us]"),
        "year": pa.Column(int, pa.Check.in_range(YEAR_MIN, YEAR_MAX)),
        "month": pa.Column(int, pa.Check.in_range(1, 12)),
        "weekday": pa.Column(int, pa.Check.in_range(1, 7)),
        "hour": _hour,
        "neighbourhood": _text,
        "neighbourhood_known": pa.Column(bool),
        "location_type": _text,
        "premises_type": _text,
        "longitude": _lon,
        "latitude": _lat,
    },
    checks=[
        pa.Check(
            lambda df: (df["robbery"] == (df["category"] == "Robbery")).all(),
            name="label_matches_category",
        ),
        pa.Check(lambda df: (df["date"].dt.year == df["year"]).all(), name="year_matches_date"),
    ],
    strict=True,
    coerce=False,
)

EXPLORE = pa.DataFrameSchema(
    {
        "event_id": _text,
        "date": pa.Column("datetime64[us]"),
        "hour": _hour,
        "weekday": pa.Column(int, pa.Check.in_range(1, 7)),
        "category": pa.Column(str, pa.Check.isin(["Bicycle theft", "Robbery", "Theft over"])),
        "longitude": _lon,
        "latitude": _lat,
        "status": _text,
        "location_type": _text,
        "premises_type": _text,
    },
    strict=True,
)

STA303 = pa.DataFrameSchema(
    {
        "Crime_Category": pa.Column(str, pa.Check.isin(CLASSES)),
        "Robbery": pa.Column(float, pa.Check.isin([0.0, 1.0])),
        "Occurrence_Time": pa.Column("datetime64[us]"),
        "Year": pa.Column(float, pa.Check.in_range(1900, 2100)),
        "Month": pa.Column(float, pa.Check.in_range(1, 12)),
        "Day_Of_Week_Numeric": pa.Column(float, pa.Check.in_range(1, 7)),
        "Hour": pa.Column(float, pa.Check.in_range(0, 23)),
        "Neighbourhood": _text,
        "Location_Type": _text,
        "Premises_Type": _text,
        "Longitude": pa.Column(float),
        "Latitude": pa.Column(float),
        "Season": pa.Column(str, pa.Check.isin(["Spring", "Summer", "Fall", "Winter"])),
        "Presence_of_Sunset": pa.Column(float, pa.Check.isin([0.0, 1.0])),
        "Covid_Outbreak": pa.Column(object, pa.Check.isin(["0", "1"])),
    },
    strict=True,
)

JSC370 = pa.DataFrameSchema(
    {
        "Robbery": pa.Column(bool),
        "Month": pa.Column(float, pa.Check.in_range(1, 12)),
        "Day_Of_Week_Numeric": pa.Column(float, pa.Check.in_range(1, 7)),
        "Hour": pa.Column(float, pa.Check.in_range(0, 23)),
        "Premises_Type": _text,
        "Longitude": pa.Column(float),
        "Latitude": pa.Column(float),
        "Season": pa.Column(str, pa.Check.isin(["Spring", "Summer", "Fall", "Winter"])),
        "Darkness": pa.Column(float, pa.Check.isin([0.0, 1.0])),
        "Individual_Median_Income": pa.Column(float),
        "Individual_Average_Income": pa.Column(float),
        "Population": pa.Column(float, pa.Check.gt(0)),
        "Average_Household_Size": pa.Column(float),
        "Number_of_Rental_Properties": pa.Column(float),
        "Permanent_Job_and_Labour_Force_Ratio": pa.Column(float, pa.Check.in_range(0, 1)),
        "Transportation_Service_Worker_and_Population_Ratio": pa.Column(
            float, pa.Check.in_range(0, 1)
        ),
        "HealthCare_Service_Worker_and_Population_Ratio": pa.Column(float, pa.Check.in_range(0, 1)),
        "Difference_in_Individual_Median_Average_Income": pa.Column(float, pa.Check.ge(0)),
    },
    strict=True,
)
