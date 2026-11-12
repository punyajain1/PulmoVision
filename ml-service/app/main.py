import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model at startup so the first request isn't slow. If loading
    # fails, log why; requests then return 503 until artifacts exist.
    from app.services import prediction_service

    try:
        prediction_service._load_artifacts()
        logger.info("Model artifacts loaded.")
    except Exception as e:
        logger.error("Could not load model artifacts: %s", e)
    yield


app = FastAPI(
    title="PulmoDetect Survey Model API",
    description="Lung cancer risk estimates from survey answers (Bagging classifier with forward feature selection), with exact SHAP explanations. Research use only, not a medical device.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "PulmoDetect Survey Model API", "docs": "/docs"}
