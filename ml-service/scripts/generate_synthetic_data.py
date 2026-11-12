"""
Generates a synthetic dataset that follows the same schema as the
public Kaggle "Lung Cancer Survey" dataset, so the rest of the
pipeline (training, EDA, API) can be exercised end-to-end even before
the real dataset is placed in ml-service/data/.

To use the real dataset instead, download it and save it as:
    ml-service/data/lung_cancer.csv
with the same column names, then just re-run scripts/train.py -
nothing else needs to change.

Run:
    python scripts/generate_synthetic_data.py
"""

import numpy as np
import pandas as pd
from pathlib import Path

RANDOM_STATE = 42
N_ROWS = 800

BINARY_SYMPTOM_COLUMNS = [
    "SMOKING",
    "YELLOW_FINGERS",
    "ANXIETY",
    "PEER_PRESSURE",
    "CHRONIC_DISEASE",
    "FATIGUE",
    "ALLERGY",
    "WHEEZING",
    "ALCOHOL_CONSUMING",
    "COUGHING",
    "SHORTNESS_OF_BREATH",
    "SWALLOWING_DIFFICULTY",
    "CHEST_PAIN",
]


def generate(n_rows=N_ROWS, seed=RANDOM_STATE):
    rng = np.random.default_rng(seed)

    gender = rng.choice(["M", "F"], size=n_rows)
    age = rng.normal(60, 12, size=n_rows).clip(21, 90).round().astype(int)

    data = {"GENDER": gender, "AGE": age}

    # symptom columns encoded 1 = No, 2 = Yes, matching the real dataset
    risk_weight = np.zeros(n_rows)
    for col in BINARY_SYMPTOM_COLUMNS:
        prob_yes = rng.uniform(0.25, 0.55)
        values = rng.choice([1, 2], size=n_rows, p=[1 - prob_yes, prob_yes])
        data[col] = values
        risk_weight += (values == 2).astype(float)

    df = pd.DataFrame(data)

    # target is more likely when more risk factors are present + older age,
    # with some noise so the problem is not trivially separable
    risk_score = (
        0.35 * risk_weight
        + 0.05 * (df["AGE"] - 50)
        + rng.normal(0, 1.5, size=n_rows)
    )
    threshold = np.quantile(risk_score, 0.55)
    df["LUNG_CANCER"] = np.where(risk_score > threshold, "YES", "NO")

    # sprinkle a few missing values and duplicate rows to exercise cleaning
    for col in ["AGE", "FATIGUE", "ALLERGY"]:
        idx = rng.choice(n_rows, size=max(1, n_rows // 100), replace=False)
        df.loc[idx, col] = np.nan

    df = pd.concat([df, df.sample(5, random_state=seed)], ignore_index=True)

    return df


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent.parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "lung_cancer.csv"

    df = generate()
    df.to_csv(out_path, index=False)
    print(f"Synthetic dataset written to {out_path} ({len(df)} rows)")
