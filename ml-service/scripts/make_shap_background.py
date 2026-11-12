"""
Recreates artifacts/shap_background.npy for an already-trained model, without
retraining. scripts/train.py writes this file itself; use this script only for
models trained before that was added.

It rebuilds the exact training split used by train.py (same cleaning, same
stratified split and seed), transforms it with the saved preprocessor, and
keeps the selected features. As a check that the split really matches, it
recomputes the test ROC-AUC and compares it with model_metadata.json.

Usage (from ml-service/):  python scripts/make_shap_background.py
"""

import json
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.utils.data_utils import clean_dataset, get_feature_columns, load_raw_dataset  # noqa: E402


def main():
    df = clean_dataset(load_raw_dataset(settings.DATASET_FULL_PATH), settings.TARGET_COLUMN)
    X = df[get_feature_columns(df, settings.TARGET_COLUMN)]
    y = df[settings.TARGET_COLUMN].values
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=settings.TEST_SIZE, random_state=settings.RANDOM_STATE, stratify=y
    )

    preprocessor = joblib.load(settings.PREPROCESSING_FILE)
    model = joblib.load(settings.MODEL_FILE)
    features = json.loads(settings.FEATURES_FILE.read_text())
    metadata = json.loads(settings.METADATA_FILE.read_text())

    idx = [features["encoded_feature_names"].index(f) for f in features["selected_features"]]
    X_train_fe = np.asarray(preprocessor.transform(X_train))[:, idx]
    X_test_fe = np.asarray(preprocessor.transform(X_test))[:, idx]

    auc = round(roc_auc_score(y_test, model.predict_proba(X_test_fe)[:, 1]), 4)
    expected = metadata["test_metrics"]["roc_auc"]
    print(f"Recomputed test ROC-AUC {auc}, model_metadata.json says {expected}")
    if auc != expected:
        sys.exit("Split does not match the trained model. Retrain with scripts/train.py instead.")

    np.save(settings.SHAP_BACKGROUND_FILE, X_train_fe.astype(np.float64))
    print(f"Saved {X_train_fe.shape[0]} x {X_train_fe.shape[1]} background to {settings.SHAP_BACKGROUND_FILE}")


if __name__ == "__main__":
    main()
