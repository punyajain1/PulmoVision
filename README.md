# PulmoDetect

PulmoDetect estimates lung cancer **risk** from a short questionnaire (gender,
age and 13 yes/no lifestyle and symptom items). It is a decision-support
research prototype, not a diagnostic tool, and it is built to be honest about
its own uncertainty: every prediction comes with a calibrated probability, an
uncertainty range, a conformal check, an unusual-input warning and an exact
explanation of which answers drove the result.

> **Disclaimer.** This system is for education and research only. It does not
> diagnose lung cancer. Its output must be interpreted by a qualified
> clinician, especially when a prediction is flagged as low confidence.

## What makes it different

Most survey-based lung cancer projects report a single accuracy figure. Because
this dataset is ~86% positive, a model that always predicts "high risk" already
scores ~86% accuracy, so that number is misleading. PulmoDetect instead:

- removes duplicate records and evaluates with nested cross-validation;
- **calibrates** the probability and chooses a sensitivity-first threshold;
- attaches a **per-prediction reliability signal** (uncertainty range +
  conformal set + unusual-input check) that flags when the result should not be
  trusted;
- explains every prediction with **exact SHAP values**;
- is **deployed** end to end, with no hidden fallback: if the model service is
  down, the API returns an error instead of a made-up result.

## Architecture

```
React (Vercel)  --JWT-->  Express API (Render)  -->  MongoDB Atlas
                                  |
                                  '-->  FastAPI ML service (Render, CPU)
                                        model v2.1.0: preprocess -> 4 selected
                                        features -> calibrated Bagging (100 trees)
                                        -> threshold, conformal, OOD, exact SHAP
```

The frontend never talks to the database or the model directly; everything goes
through the Express API.

## Tech stack

- **Frontend:** React, React Router, Axios, Recharts, Vite.
- **Backend:** Node.js, Express, MongoDB/Mongoose, JWT, bcrypt, express-rate-limit, Swagger.
- **ML service:** Python, FastAPI, scikit-learn, NumPy, joblib.

## The model (v2.1.0)

| Item | Value |
|---|---|
| Algorithm | Bagging classifier (100 class-weighted decision trees), Platt-calibrated |
| Feature selection | Greedy sequential forward selection, scored by 5-fold balanced accuracy on the training split |
| Selected features | allergy, swallowing difficulty, peer pressure, coughing |
| Threshold | 0.647 (highest with out-of-fold sensitivity >= 0.90) |
| Reliability | 10th-90th percentile tree-spread range; class-conditional conformal sets; age/answer-pattern unusual-input check |
| Explanation | Exact interventional SHAP over the 4 selected features |

**Honest performance** (nested cross-validation, deduplicated 276-row data):
ROC-AUC 0.85, balanced accuracy 0.74-0.79. Calibration lowers the Brier score
from 0.138 to 0.092. See `ml-service/README.md` (the model card) for full
numbers and `PULMODETECT_RESEARCH_PAPER.md` for the study.

The deployed model deliberately uses only four features and does **not** include
smoking or age. This reflects associations in this particular survey dataset,
not medical evidence; the app's What-If tool makes the used features visible.

## Folder structure

```
pulmoscanai-main/
|- frontend/          React app (pages, components, services)
|- backend/           Express API (routes -> controllers -> services -> models)
|  '- scripts/        maintenance scripts (e.g. clean_legacy_predictions.js)
|- ml-service/        FastAPI ML service + training/eval pipeline
|  |- app/            API, schemas, services (prediction, reliability, explanation)
|  |- scripts/        train.py, make_shap_background.py
|  |- training/survey/ nested_cv.py, paper_experiments.py, latency_test.py, paper_diagrams.py
|  |- artifacts/      trained model, preprocessing, reliability + SHAP background
|  |- results/        evaluation outputs; results/paper/ holds the paper's tables/figures
|  '- README.md       model card
|- paper/             IEEE conference paper (pulmodetect.tex) + figures
|- PULMODETECT_RESEARCH_PAPER.md   the research-paper plan
'- docker-compose.yml
```

## Running locally

### 1. ML service
```bash
cd ml-service
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# put the dataset at data/lung_cancer.csv (Kaggle: mysarahmadbhat/lung-cancer), then:
python scripts/train.py            # writes artifacts/ (model, calibration, SHAP background)
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env    # set MONGODB_URI, JWT_SECRET, ML_SERVICE_URL, CLIENT_URLS
npm run dev
```
Swagger: http://localhost:5000/api-docs

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env    # set VITE_API_URL=http://localhost:5000/api
npm run dev
```
App: http://localhost:5173

## Environment variables

**backend/.env**
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/lung_cancer_risk
JWT_SECRET=<32+ random chars; required in production>
CLIENT_URLS=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
ML_TIMEOUT_MS=75000
GEMINI_API_KEY=            # optional; chatbot falls back to built-in answers
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000/api
```

## Reproducing the study

```bash
cd ml-service
PYTHONPATH=. python training/survey/paper_experiments.py 10   # tables + figures -> results/paper/
PYTHONPATH=. python training/survey/paper_diagrams.py         # architecture + nested-CV diagrams
python training/survey/latency_test.py http://localhost:8000 local   # response-time test
```
All numbers in the paper come from `ml-service/results/paper/summary.json` with
a fixed random seed.

## Dataset

Public "Lung Cancer" survey dataset (Kaggle: `mysarahmadbhat/lung-cancer`), 309
rows, 16 columns. Check its licence before reuse. The CSV is **not** committed;
download it and place it at `ml-service/data/lung_cancer.csv`.

## Maintenance

- `backend/scripts/clean_legacy_predictions.js` removes predictions written by
  the old scoring formula (those without a `modelVersion`). Run with `--delete`.

## Disclaimer

For education and research only. It does not provide a medical diagnosis, and
it never tells a user they "have lung cancer." Consult a qualified healthcare
professional for any health concern.
