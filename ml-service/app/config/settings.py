import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATASET_PATH = os.getenv("DATASET_PATH", "data/lung_cancer.csv")
MODEL_PATH = os.getenv("MODEL_PATH", "artifacts")

DATASET_FULL_PATH = BASE_DIR / DATASET_PATH
MODEL_DIR = BASE_DIR / MODEL_PATH
RESULTS_DIR = BASE_DIR / "results"

MODEL_FILE = MODEL_DIR / "bagging_model.joblib"
PREPROCESSING_FILE = MODEL_DIR / "preprocessing.joblib"
FEATURES_FILE = MODEL_DIR / "selected_features.json"
METADATA_FILE = MODEL_DIR / "model_metadata.json"

TARGET_COLUMN = "LUNG_CANCER"
RANDOM_STATE = 42
TEST_SIZE = 0.2
MAX_FORWARD_FEATURES = 10
CV_FOLDS = 5
