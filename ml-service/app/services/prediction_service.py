import json
import joblib
import pandas as pd

from app.config import settings

_model = None
_preprocessor = None
_features = None
_metadata = None


class ArtifactsNotFoundError(Exception):
    pass


def _load_artifacts():
    global _model, _preprocessor, _features, _metadata

    if not settings.MODEL_FILE.exists() or not settings.PREPROCESSING_FILE.exists():
        raise ArtifactsNotFoundError(
            "Model artifacts not found. Run `python scripts/train.py` first."
        )

    _model = joblib.load(settings.MODEL_FILE)
    _preprocessor = joblib.load(settings.PREPROCESSING_FILE)

    with open(settings.FEATURES_FILE) as f:
        _features = json.load(f)

    with open(settings.METADATA_FILE) as f:
        _metadata = json.load(f)


def get_model_info():
    if _metadata is None:
        _load_artifacts()
    return _metadata


def get_selected_features():
    if _features is None:
        _load_artifacts()
    return _features


def predict(input_data: dict):
    if _model is None:
        _load_artifacts()

    raw_columns = _features["raw_feature_columns"]
    row = {col: input_data.get(col) for col in raw_columns}
    df = pd.DataFrame([row])

    encoded = _preprocessor.transform(df)
    if hasattr(encoded, "toarray"):
        encoded = encoded.toarray()

    encoded_names = _features["encoded_feature_names"]
    selected = _features["selected_features"]
    selected_idx = [encoded_names.index(f) for f in selected]

    X = encoded[:, selected_idx]

    proba = _model.predict_proba(X)[0][1]
    label = "High Risk" if proba >= 0.5 else "Low Risk"

    return {
        "prediction": label,
        "probability": round(float(proba), 4),
        "modelName": _metadata.get("model_name", "BaggingClassifier"),
    }
