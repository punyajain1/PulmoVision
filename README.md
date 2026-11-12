# Lung Cancer Risk Prediction

Full-stack app that predicts lung cancer risk from lifestyle/symptom survey
data. React frontend, an Express/MongoDB backend for auth and history, and a
Python/FastAPI ML service that serves a Bagging Classifier trained with
sequential forward feature elimination.

> **Disclaimer:** This system is for educational and research purposes only
> and is not a medical diagnosis.

## Features

- Register/login with JWT auth, passwords hashed with bcrypt
- Prediction form grouped into Demographics / Lifestyle / Symptoms
- Risk predictions stored per-user, with a history page and delete
- Dashboard: total/high/low risk counts, risk distribution chart, recent
  predictions, and the currently deployed model's info
- ML pipeline: cleaning, EDA, sequential forward feature elimination
  (cross-validated on the training set only), a Bagging Classifier as the
  primary model, and a comparison against Logistic Regression, Decision
  Tree, Random Forest, and SVM - both with and without forward elimination
- Swagger UI for the Express API, automatic OpenAPI docs for FastAPI

## Architecture

```
React (frontend)
   -> Express API (backend)
        -> MongoDB (users, predictions)
        -> FastAPI ML service (backend)
             -> saved preprocessing + Bagging model (joblib)
```

The frontend never talks to MongoDB or the ML service directly - everything
goes through the Express API.

## Tech stack

- **Frontend:** React, React Router, Axios, Recharts, plain CSS (Vite)
- **Backend:** Node.js, Express, MongoDB + Mongoose, JWT, bcrypt, Swagger/OpenAPI
- **ML:** Python, FastAPI, pandas, NumPy, scikit-learn, joblib, matplotlib, seaborn

## Folder structure

```
root/
├── frontend/            React app (pages, components, services)
├── backend/              Express API (routes -> controllers -> services -> models)
├── ml-service/           FastAPI ML service + training pipeline
│   ├── app/               API, schemas, services, config
│   ├── scripts/           train.py, generate_synthetic_data.py
│   ├── data/               place the dataset CSV here
│   ├── artifacts/          saved model / preprocessing / metadata
│   └── results/             EDA + evaluation plots
├── docker-compose.yml
└── README.md
```

## Dataset

The pipeline expects a CSV with the same schema as the public "Lung Cancer
Survey" dataset: `GENDER`, `AGE`, plus a set of binary yes/no symptom and
lifestyle columns (smoking, yellow fingers, anxiety, peer pressure, chronic
disease, fatigue, allergy, wheezing, alcohol consuming, coughing, shortness
of breath, swallowing difficulty, chest pain), and a `LUNG_CANCER` target
column.

Column names are normalized (case/spacing-insensitive) and common value
encodings (`1`/`2`, `Yes`/`No`) are handled automatically, so small naming
differences won't break the pipeline.

**To use the real dataset:** download it and save it as
`ml-service/data/lung_cancer.csv`, then run the training script (below).

**If you don't have it yet:** `scripts/train.py` will automatically generate
a synthetic dataset with the same schema at that path so you can run the
whole system end-to-end immediately. Swap in the real CSV and re-run
training whenever you're ready - nothing else changes.

## Forward Elimination

Implemented in `ml-service/app/services/forward_elimination_service.py` as
true sequential forward selection:

1. Start with an empty feature set
2. For every remaining feature, try adding it and score with cross-validation
   **on the training split only**
3. Keep whichever feature gives the best cross-validated score
4. Repeat until the best available improvement is below a threshold, or the
   max feature count is reached

The test set is never touched during selection - it's held out purely for
final evaluation.

## Bagging Classifier

The primary model is `BaggingClassifier(estimator=DecisionTreeClassifier())`.
`scripts/train.py` also trains Logistic Regression, a single Decision Tree,
Random Forest, and SVM as points of comparison, both on all features and on
the forward-elimination-selected subset, and writes accuracy/precision/
recall/F1/ROC-AUC for each to `ml-service/results/model_comparison.json`.

## Installation

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (local install or a free MongoDB Atlas cluster)

### 1. ML service

```bash
cd ml-service
python -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp .env.example .env    # adjust DATASET_PATH / MODEL_PATH if needed

# place your dataset at data/lung_cancer.csv, or skip this and let
# train.py generate a synthetic placeholder automatically
python scripts/train.py

uvicorn app.main:app --reload --port 8000
```

FastAPI docs: http://localhost:8000/docs

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # set MONGODB_URI, JWT_SECRET, ML_SERVICE_URL
npm run dev
```

Express Swagger docs: http://localhost:5000/api-docs

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # set VITE_API_URL
npm run dev
```

App: http://localhost:5173

### Or with Docker Compose

```bash
docker compose up --build
```

## Environment variables

**backend/.env**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lung_cancer_risk
JWT_SECRET=change-this-to-a-long-random-string
ML_SERVICE_URL=http://localhost:8000
CLIENT_URL=http://localhost:5173
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000/api
```

**ml-service/.env**
```
DATASET_PATH=data/lung_cancer.csv
MODEL_PATH=artifacts
```

## MongoDB setup

Any of these work:
- Local install: `mongod --dbpath <your-data-dir>`, then use
  `mongodb://localhost:27017/lung_cancer_risk`
- Docker: `docker run -p 27017:27017 mongo:7`
- MongoDB Atlas: create a free cluster and use its connection string as
  `MONGODB_URI`

## Running ML training

```bash
cd ml-service
python scripts/train.py
```

This loads/cleans the data, runs EDA (plots saved to `results/`), compares
baseline models with and without forward elimination, trains the final
Bagging model, evaluates it on the held-out test set, and saves:

- `artifacts/bagging_model.joblib`
- `artifacts/preprocessing.joblib`
- `artifacts/selected_features.json`
- `artifacts/model_metadata.json`
- `results/confusion_matrix.png`, `results/roc_curve.png`,
  `results/model_comparison.png`, plus EDA plots and JSON summaries

## API examples

**Register**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"SecurePass123"}'
```

**Predict** (replace `<token>` with the JWT from register/login)
```bash
curl -X POST http://localhost:5000/api/predictions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "GENDER":"M","AGE":65,"SMOKING":1,"YELLOW_FINGERS":1,"ANXIETY":0,
    "PEER_PRESSURE":0,"CHRONIC_DISEASE":1,"FATIGUE":1,"ALLERGY":0,
    "WHEEZING":1,"ALCOHOL_CONSUMING":1,"COUGHING":1,
    "SHORTNESS_OF_BREATH":1,"SWALLOWING_DIFFICULTY":0,"CHEST_PAIN":1
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "prediction": "High Risk",
    "probability": 0.87,
    "modelName": "BaggingClassifier"
  }
}
```

## Disclaimer

This system is for educational and research purposes only. It does not
provide a medical diagnosis, and the app deliberately avoids ever telling a
user they "have lung cancer." If you have health concerns, consult a
qualified healthcare professional.
