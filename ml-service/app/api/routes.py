from fastapi import APIRouter, HTTPException

from app.schemas.predict_schema import (
    PredictionInput,
    PredictionOutput,
    ModelInfo,
    FeaturesResponse,
)
from app.services import prediction_service

router = APIRouter()


@router.get("/health", tags=["System"])
def health_check():
    return {"status": "ok"}


@router.get("/model/info", response_model=ModelInfo, tags=["Model"])
def model_info():
    try:
        return prediction_service.get_model_info()
    except prediction_service.ArtifactsNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/features", response_model=FeaturesResponse, tags=["Model"])
def features():
    try:
        return prediction_service.get_selected_features()
    except prediction_service.ArtifactsNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/predict", response_model=PredictionOutput, tags=["Prediction"])
def predict(input_data: PredictionInput):
    try:
        return prediction_service.predict(input_data.model_dump())
    except prediction_service.ArtifactsNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {e}")


@router.get("/results/model-comparison", tags=["Model"])
def model_comparison():
    import json
    from app.config import settings
    comparison_file = settings.RESULTS_DIR / "model_comparison.json"
    if not comparison_file.exists():
        raise HTTPException(status_code=404, detail="Model comparison results not found. Run training first.")
    with open(comparison_file, "r") as f:
        return json.load(f)


@router.get("/results/feature-elimination", tags=["Model"])
def feature_elimination():
    import json
    from app.config import settings
    history_file = settings.RESULTS_DIR / "forward_elimination_history.json"
    if not history_file.exists():
        raise HTTPException(status_code=404, detail="Feature elimination history not found. Run training first.")
    with open(history_file, "r") as f:
        return json.load(f)

