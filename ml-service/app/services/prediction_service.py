import json
import threading

import joblib
import numpy as np
import pandas as pd

from app.config import settings
from app.services.explanation_service import exact_shap
from app.services.reliability_service import assess

_model = None
_preprocessor = None
_features = None
_metadata = None
_background = None
_reliability = None
_lock = threading.Lock()

FEATURE_LABELS = {
    "GENDER": "Gender",
    "AGE": "Age",
    "SMOKING": "Smoking",
    "YELLOW_FINGERS": "Yellow fingers",
    "ANXIETY": "Anxiety",
    "PEER_PRESSURE": "Peer pressure",
    "CHRONIC_DISEASE": "Chronic disease",
    "FATIGUE": "Fatigue",
    "ALLERGY": "Allergy",
    "WHEEZING": "Wheezing",
    "ALCOHOL_CONSUMING": "Alcohol consumption",
    "COUGHING": "Coughing",
    "SHORTNESS_OF_BREATH": "Shortness of breath",
    "SWALLOWING_DIFFICULTY": "Swallowing difficulty",
    "CHEST_PAIN": "Chest pain",
}


class ArtifactsNotFoundError(Exception):
    pass


def _load_artifacts():
    global _model, _preprocessor, _features, _metadata, _background, _reliability

    with _lock:
        if _model is not None:
            return

        required = [
            settings.MODEL_FILE,
            settings.PREPROCESSING_FILE,
            settings.FEATURES_FILE,
            settings.METADATA_FILE,
            settings.RELIABILITY_FILE,
        ]
        missing = [p.name for p in required if not p.exists()]
        if missing:
            raise ArtifactsNotFoundError(
                f"Model artifacts not found ({', '.join(missing)}). Run `python scripts/train.py` first."
            )

        preprocessor = joblib.load(settings.PREPROCESSING_FILE)
        features = json.loads(settings.FEATURES_FILE.read_text())
        metadata = json.loads(settings.METADATA_FILE.read_text())

        background = None
        if settings.SHAP_BACKGROUND_FILE.exists():
            background = np.load(settings.SHAP_BACKGROUND_FILE)
            if background.shape[0] > settings.SHAP_BACKGROUND_SIZE:
                rng = np.random.default_rng(settings.RANDOM_STATE)
                rows = rng.choice(background.shape[0], settings.SHAP_BACKGROUND_SIZE, replace=False)
                background = background[np.sort(rows)]

        reliability = json.loads(settings.RELIABILITY_FILE.read_text())

        # Assign the model last: it is the "loaded" flag checked above.
        _preprocessor, _features, _metadata, _background = preprocessor, features, metadata, background
        _reliability = reliability
        _model = joblib.load(settings.MODEL_FILE)


def _ensure_loaded():
    if _model is None:
        _load_artifacts()


def get_model_info():
    _ensure_loaded()
    return _metadata


def get_selected_features():
    _ensure_loaded()
    return _features


def _raw_column(encoded_name):
    """Maps an encoded feature (e.g. GENDER_F) back to its input column (GENDER)."""
    if encoded_name in _features["raw_feature_columns"]:
        return encoded_name
    for col in _features["raw_feature_columns"]:
        if encoded_name.startswith(col + "_"):
            return col
    return encoded_name


def _encode(input_rows):
    raw_columns = _features["raw_feature_columns"]
    df = pd.DataFrame([{col: row.get(col) for col in raw_columns} for row in input_rows])
    encoded = _preprocessor.transform(df)
    if hasattr(encoded, "toarray"):
        encoded = encoded.toarray()
    names = _features["encoded_feature_names"]
    idx = [names.index(f) for f in _features["selected_features"]]
    return np.asarray(encoded, dtype=float)[:, idx]


def predict(input_data: dict, explain: bool = True):
    _ensure_loaded()

    X = _encode([input_data])
    proba = float(_model.predict_proba(X)[0][1])
    # Label from the screening threshold, plus uncertainty, conformal set and
    # unusual-input flags (see reliability_service.py).
    reliability = assess(_model, _reliability, X[0], proba, input_data.get("AGE"))

    selected = _features["selected_features"]
    result = {
        "prediction": reliability["prediction"],
        "probability": round(proba, 4),
        "calibrated": bool(_metadata.get("calibrated", False)),
        "threshold": reliability["threshold"],
        "trainingPositiveRate": reliability["trainingPositiveRate"],
        "uncertainty": reliability["uncertainty"],
        "conformal": reliability["conformal"],
        "outOfDistribution": reliability["outOfDistribution"],
        "lowConfidence": reliability["lowConfidence"],
        "modelName": _metadata.get("model_name", "BaggingClassifier"),
        "modelId": _metadata.get("model_id"),
        "modelVersion": _metadata.get("model_version"),
        "modelFeatures": sorted({_raw_column(f) for f in selected}),
        "baseValue": None,
        "explanation": [],
    }

    if explain and _background is not None:
        base, phi = exact_shap(_model.predict_proba, X[0], _background)
        items = []
        for name, value in zip(selected, phi):
            raw = _raw_column(name)
            items.append({
                "feature": raw,
                "encodedFeature": name,
                "label": FEATURE_LABELS.get(raw, raw),
                "value": input_data.get(raw),
                "shap": round(float(value), 4),
            })
        items.sort(key=lambda item: abs(item["shap"]), reverse=True)
        result["baseValue"] = round(base, 4)
        result["explanation"] = items

    return result
