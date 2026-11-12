from typing import Optional
from pydantic import BaseModel, Field


class PredictionInput(BaseModel):
    GENDER: str = Field(..., description="M or F")
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

    class Config:
        json_schema_extra = {
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


class PredictionOutput(BaseModel):
    prediction: str
    probability: float
    modelName: str


class ModelInfo(BaseModel):
    model_name: str
    base_estimator: Optional[str] = None
    n_features_selected: Optional[int] = None
    n_features_total: Optional[int] = None
    test_metrics: Optional[dict] = None
    trained_at: Optional[str] = None


class FeaturesResponse(BaseModel):
    selected_features: list[str]
    raw_feature_columns: list[str]
