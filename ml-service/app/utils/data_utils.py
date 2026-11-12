"""
Helpers for loading and cleaning the lung cancer dataset.

The public "Lung Cancer Survey" dataset has these raw columns:
GENDER, AGE, SMOKING, YELLOW_FINGERS, ANXIETY, PEER_PRESSURE,
CHRONIC DISEASE, FATIGUE, ALLERGY, WHEEZING, ALCOHOL CONSUMING,
COUGHING, SHORTNESS OF BREATH, SWALLOWING DIFFICULTY, CHEST PAIN,
LUNG_CANCER

Most binary symptom columns are encoded 1 = No, 2 = Yes and GENDER is
M/F. This module normalizes column names and value encodings so the
rest of the pipeline does not need to know about the raw format. It is
intentionally forgiving about small naming differences (extra spaces,
different casing, underscores vs spaces) so a slightly different CSV
still loads correctly.
"""

import pandas as pd


def _normalize_column_name(col: str) -> str:
    return col.strip().upper().replace(" ", "_")


def load_raw_dataset(path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [_normalize_column_name(c) for c in df.columns]
    return df


def _looks_binary_yes_no(series: pd.Series) -> bool:
    values = set(series.dropna().unique())
    return values.issubset({1, 2, "1", "2", "Yes", "No", "YES", "NO", "yes", "no"})


def clean_dataset(df: pd.DataFrame, target_column: str) -> pd.DataFrame:
    df = df.copy()

    # drop exact duplicate rows
    df = df.drop_duplicates()

    # drop rows missing the target - we can't use those for training
    df = df.dropna(subset=[target_column])

    # basic missing value handling: numeric -> median, categorical -> mode
    for col in df.columns:
        if col == target_column:
            continue
        if df[col].dtype in ("int64", "float64"):
            if df[col].isna().any():
                df[col] = df[col].fillna(df[col].median())
        else:
            if df[col].isna().any():
                df[col] = df[col].fillna(df[col].mode().iloc[0])

    # normalize GENDER to M/F
    if "GENDER" in df.columns:
        df["GENDER"] = df["GENDER"].astype(str).str.strip().str.upper().str[0]

    # normalize yes/no-style binary columns encoded as 1/2 or Yes/No into 0/1
    for col in df.columns:
        if col in (target_column, "GENDER", "AGE"):
            continue
        if df[col].dtype == object:
            mapped = df[col].astype(str).str.strip().str.upper().map(
                {"YES": 1, "NO": 0, "1": 1, "2": 0, "TRUE": 1, "FALSE": 0}
            )
            if mapped.notna().all():
                df[col] = mapped.astype("int64")
        elif set(df[col].dropna().unique()).issubset({1, 2}):
            # dataset convention: 2 = Yes, 1 = No
            df[col] = df[col].map({2: 1, 1: 0}).astype("int64")

    # normalize target to 0/1
    if df[target_column].dtype == object:
        df[target_column] = (
            df[target_column].astype(str).str.strip().str.upper().map(
                {"YES": 1, "NO": 0, "1": 1, "0": 0}
            )
        )
    df[target_column] = df[target_column].astype("int64")

    return df.reset_index(drop=True)


def get_feature_columns(df: pd.DataFrame, target_column: str):
    return [c for c in df.columns if c != target_column]
