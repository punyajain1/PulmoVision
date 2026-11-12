from typing import Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class PredictionInput(BaseModel):
    GENDER: Literal["M", "F"] = Field(..., description="M or F")
    AGE: int = Field(..., ge=1, le=120)
    SMOKING: int = Field(..., ge=0, le=1)
    YELLOW_FINGERS: int = Field(..., ge=0, le=1)
    ANXIETY: int = Field(..., ge=0, le=1)
    PEER_PRESSURE: int = Field(..., ge=0, le=1)
    CHRONIC_DISEASE: int = Field(..., ge=0, le=1)
    FATIGUE: int = Field(..., ge=0, le=1)
    ALLERGY: int = Field(..., ge=0, le=1)
    WHEEZING: int = Field(..., ge=0, le=1)
    ALCOHOL_CONSUMING: int = Field(..., ge=0, le=1)
    COUGHING: int = Field(..., ge=0, le=1)
    SHORTNESS_OF_BREATH: int = Field(..., ge=0, le=1)
    SWALLOWING_DIFFICULTY: int = Field(..., ge=0, le=1)
    CHEST_PAIN: int = Field(..., ge=0, le=1)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "GENDER": "M",
                "AGE": 65,
                "SMOKING": 1,
                "YELLOW_FINGERS": 1,
                "ANXIETY": 0,
                "PEER_PRESSURE": 0,
                "CHRONIC_DISEASE": 1,
                "FATIGUE": 1,
                "ALLERGY": 0,
                "WHEEZING": 1,
                "ALCOHOL_CONSUMING": 1,
                "COUGHING": 1,
                "SHORTNESS_OF_BREATH": 1,
                "SWALLOWING_DIFFICULTY": 0,
                "CHEST_PAIN": 1,
            }
        }
    )


class FeatureContribution(BaseModel):
    feature: str
    encodedFeature: str
    label: str
    value: Optional[Union[int, str]] = None
    # Change in predicted probability caused by this answer, compared with the
    # average training case (baseValue). baseValue + sum(shap) == probability.
    shap: float


class Uncertainty(BaseModel):
    # Percentile range of the bootstrap trees' calibrated probabilities.
    low: float
    high: float
    std: float
    percentiles: list[int]


class ConformalResult(BaseModel):
    set: list[str]
    # confident (one label), uncertain (both labels) or atypical (no label)
    status: Literal["confident", "uncertain", "atypical"]
    coverageTarget: float


class OutOfDistribution(BaseModel):
    flag: bool
    reasons: list[str]
    similarTrainingCases: Optional[int] = None


class PredictionOutput(BaseModel):
    prediction: str
    # Calibrated to the training data, where ~86% of participants had lung cancer.
    probability: float
    calibrated: bool = False
    threshold: float
    trainingPositiveRate: Optional[float] = None
    uncertainty: Uncertainty
    conformal: ConformalResult
    outOfDistribution: OutOfDistribution
    lowConfidence: bool
    modelName: str
    modelId: Optional[str] = None
    modelVersion: Optional[str] = None
    modelFeatures: list[str] = []
    baseValue: Optional[float] = None
    explanation: list[FeatureContribution] = []


class ModelInfo(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_name: str
    model_id: Optional[str] = None
    model_version: Optional[str] = None
    base_estimator: Optional[str] = None
    n_features_selected: Optional[int] = None
    n_features_total: Optional[int] = None
    calibrated: Optional[bool] = None
    threshold: Optional[float] = None
    test_metrics: Optional[dict] = None
    test_reliability: Optional[dict] = None
    calibration: Optional[dict] = None
    training_positive_rate: Optional[float] = None
    training_rows: Optional[int] = None
    test_rows: Optional[int] = None
    trained_at: Optional[str] = None


class FeaturesResponse(BaseModel):
    selected_features: list[str]
    raw_feature_columns: list[str]
