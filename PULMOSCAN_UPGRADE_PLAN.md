# PulmoScan AI: Upgrade Plan for a Four-Model Decision-Support System

> **Medical disclaimer:** PulmoScan AI is an educational and research project. It does not diagnose lung cancer. Every output is decision support that a qualified clinician must review. Demos must use public, de-identified datasets only, never real patient files.

---

## 0. How to use this document

- Work through the phases in order. Phase 0 (fixing the existing system) must be finished first, because every later result depends on it.
- Each model section ends with a "Done when" list. Don't start the next model until that list is checked off.
- File paths are relative to the repository root (`pulmoscanai-main/`).
- The X-ray, CT and report models are each optional on their own. If time runs short, drop the CT model first.

---

## 1. Goal

Turn PulmoScan AI into a modular decision-support system with four independently trained and independently evaluated models:

| # | Model | Input | Output | Training data |
|---|---|---|---|---|
| 1 | Survey risk model | Gender, age, 13 yes/no lifestyle and symptom answers | Risk probability, risk label, SHAP explanation | Kaggle Lung Cancer Survey (NLST if approved) |
| 2 | Chest X-ray model | Frontal chest X-ray image | Probability of nodule, probability of mass, Grad-CAM heatmap | NIH ChestX-ray14 (external test: JSRT) |
| 3 | CT nodule model | CT scan (DICOM series) plus nodule location | Malignancy suspicion score, heatmap on CT slices | LIDC-IDRI / LUNA16 |
| 4 | Report analysis model | Radiology report (PDF, image or text) | Structured findings (nodule, mass, size, location, recommendation) with the quoted evidence | IU X-ray (OpenI) reports |

**Core rule:** the app shows the four results side by side, each labelled with its model, version and training dataset. It never merges them into one combined score. A combined score needs a fusion model trained on data where the same patients have all inputs, and no public dataset provides that. (NLST is the only exception; see section 16.)

---

## 2. Where the project stands today (audit summary)

| Area | Problem | Location | Fixed in |
|---|---|---|---|
| ML | No trained model in the repo (`.joblib` files are gitignored), so `/predict` returns 503 | `ml-service/artifacts/` | 4.1 |
| ML | The saved model uses one feature (`GENDER_F`) and has test ROC-AUC 0.41. It predicts "positive" for everyone | `ml-service/artifacts/model_metadata.json` | 4.1, 5 |
| ML | Feature selection scores by plain accuracy on 86/14 imbalanced data, so features tie and the first one wins | `ml-service/app/services/forward_elimination_service.py` | 4.1 |
| ML | `.astype(int)` gives int32 on Windows and int64 on Linux/macOS, so the encoded feature space depends on the OS | `ml-service/app/utils/data_utils.py`, `preprocessing_service.py` | 4.1 |
| ML | The first step's improvement is saved as `Infinity`, which is invalid JSON and breaks `/results/feature-elimination` | `forward_elimination_service.py` | 4.1 |
| ML | GENDER is not normalized at inference ("m" or "Male" fails) | `ml-service/app/services/prediction_service.py` | 4.1 |
| Backend | A hand-weighted formula silently replaces the model on any ML error and is stored under the model's name | `backend/src/services/mlService.js` | 4.2 |
| Backend | "Feature contributions" come from hardcoded weights, not from the model | `backend/src/services/mlService.js` | 4.2, 5.9 |
| Backend | `PATCH /api/predictions/:id/review` has no ownership or role check | `backend/src/services/predictionService.js` | 4.4 |
| Backend | CORS allows every origin, the JWT secret has a public default, there is no rate limiting, and `/api/ai/chat` needs no login | `backend/src/app.js`, `config/env.js`, `routes/aiRoutes.js` | 4.4 |
| Backend | Uploads travel as base64 in JSON and are stored inside MongoDB documents (16 MB limit), and list endpoints return every file | `predictionService.js`, `dashboardService.js` | 10 |
| Frontend | The What-If simulator, report-modal metrics, Research page fallbacks and the "Model Service Online" badge are hardcoded | `PredictionResult.jsx`, `ClinicalReportModal.jsx`, `ResearchBench.jsx`, `Navbar.jsx` | 4.3, 11 |
| Frontend | `PredictionResult` returns before its hooks run (Rules of Hooks violation) | `frontend/src/components/PredictionResult.jsx` | 4.3 |
| Frontend | Defaults point at the production API, the 10 s timeout cuts off slow predictions, and any `getMe` failure logs the user out | `frontend/src/services/api.js`, `context/AuthContext.jsx` | 4.3 |
| DevOps | `docker-compose.yml` references backend and frontend Dockerfiles that don't exist | repo root | 4.5 |
| Quality | No tests anywhere | all | 13 |

---

## 3. Target system

### 3.1 Architecture

```
                         ┌────────────────────────────────────────────┐
React frontend (Vercel)  │  Assessment page: Survey | X-ray | CT | Report
                         └───────────────┬────────────────────────────┘
                                         │ HTTPS, JWT, multipart/form-data
                         ┌───────────────▼────────────────────────────┐
Express backend (Render) │ Auth, roles, validation, uploads, assessment │
                         │ lifecycle, private file storage, audit log   │
                         └───────┬───────────────────────┬────────────┘
                                 │                       │
                       MongoDB Atlas              Private file storage
                       (assessments, users)       (uploads, heatmaps)
                                 │
                         ┌───────▼────────────────────────────────────┐
FastAPI ML service       │ /v1/survey/predict    → Model 1            │
(Hugging Face Spaces     │ /v1/xray/predict      → Model 2 (ONNX)     │
 or Render)              │ /v1/ct/predict        → Model 3 (ONNX)     │
                         │ /v1/report/analyze    → Model 4 (OCR + NLP)│
                         │ /v1/models            → model registry     │
                         └────────────────────────────────────────────┘
```

### 3.2 Design rules

1. **Each module is optional.** A user can run only the survey, only an X-ray, or any combination.
2. **Each result is labelled** with model name, version, training dataset, and what the output means (for example "nodule/mass probability", not "cancer probability").
3. **No merged score** across modules (see section 1).
4. **No silent fallbacks.** If a model is unavailable, that module shows "unavailable" and nothing is invented.
5. **Explanations come from the real model**: SHAP for the survey model, Grad-CAM for the image models, quoted evidence text for the report model.
6. **Uploads are private.** Only the owner and assigned doctors can access them, and they are deleted with the assessment.

### 3.3 Request flow

1. The user opens `/assess`, fills in the survey, and optionally attaches an X-ray, a CT series and a report.
2. The frontend sends one `multipart/form-data` request to `POST /api/assessments`.
3. The backend validates everything, stores files privately, creates an `Assessment` with status `processing`, and returns `202 Accepted` with the assessment id.
4. The backend calls each relevant ML endpoint and saves each module's result or error separately.
5. The frontend polls `GET /api/assessments/:id` every 2 seconds until status is `completed` or `partial`.
6. The result page shows one card per module, plus the doctor-review panel.

---

## 4. Phase 0: Fix the existing system

### 4.1 ML pipeline (`ml-service/`)

- [ ] **Fix dtypes.** In `clean_dataset`, cast binary columns with `.astype("int64")`. In `build_preprocessing_pipeline`, pass explicit column lists (`numeric = ["AGE"] + BINARY_COLUMNS`, `categorical = ["GENDER"]`) instead of detecting by dtype.
- [ ] **Fix feature selection scoring.** Default `scoring="balanced_accuracy"` (also try `"roc_auc"`). Start `best_score` at `None` and write `improvement = null` for step 1 so no `Infinity` is saved.
- [ ] **Make selection deterministic.** Break ties by a fixed feature order and record the tie in the history.
- [ ] **Normalize GENDER at inference.** Use the same function as training (uppercase, first letter, must be M or F) and validate it in the Pydantic schema with `Literal["M", "F"]` plus a pre-validator.
- [ ] **Clear errors.** Startup logs artifact-loading errors instead of swallowing them. `/health` reports `model_loaded: true/false` for each model. A missing JSON artifact returns 503, not 400 or 500.
- [ ] **Use lifespan instead of `@app.on_event`** (deprecated in FastAPI).
- [ ] **Load `.env`** with `pydantic-settings`, or delete `.env.example` entries that nothing reads.
- [ ] **Split requirements** into `requirements-serve.txt` (fastapi, uvicorn, scikit-learn, onnxruntime, numpy, pandas, pillow, pydicom, SimpleITK) and `requirements-train.txt` (adds matplotlib, seaborn, shap, torch, monai, transformers, imbalanced-learn, pylidc).
- [ ] **Pin and record versions.** Save Python, scikit-learn, numpy and torch versions plus the random seed in each model's metadata.
- [ ] **Remove automatic synthetic data.** `train.py` should fail with a clear message if the dataset is missing, and generate synthetic data only with an explicit `--synthetic` flag.
- [ ] **Do imputation inside the pipeline** (fit on the training fold only) instead of in `clean_dataset`.

### 4.2 Backend (`backend/`)

- [ ] **Delete the fallback formula** in `mlService.js` (`computeFeatureContributions` and the fallback branch). When the ML service fails, return `503` with `{ module: "survey", error: "Model service unavailable" }`.
- [ ] **Delete the hardcoded metric fallbacks** in `getModelInfo`, `getModelComparison` and `getFeatureElimination`, and the `../../../ml-service` file reads. Return 503 if the ML service is down.
- [ ] **Raise the ML timeout** to 15 s for the survey model and 60 s for image and report modules (configurable through env).
- [ ] **Save provenance** with every result: `modelId`, `modelVersion`, `engine`, `servedAt`.
- [ ] **Validate the full survey payload** with express-validator: all 13 binary fields must be 0 or 1 (`isIn([0,1])`, `toInt`), `AGE` is `toInt()`, `GENDER` is `isIn(["M","F"])`, and unknown keys are rejected.
- [ ] **Make error shapes consistent.** `validate.js` returns `{ success:false, message, errors }`, and 500s return a generic message in production.
- [ ] **Add an index on `userId`** to the prediction and assessment models.
- [ ] **Remove dead code**: the commented-out `ApiError`, unused `fail()`, the unused import, and the duplicated `isValid` checks.
- [ ] **Add a `backend/.env.example`** listing every variable.
- [ ] **Remove the process-wide DNS override** in `config/db.js`, or apply it only when a flag is set.

### 4.3 Frontend (`frontend/`)

- [ ] **Fix hooks order** in `PredictionResult.jsx`: move `if (!result) return null` below all hooks, or split into a wrapper component.
- [ ] **Remove the hardcoded What-If formula.** Either delete the simulator or make it call the real survey model (`POST /api/survey/simulate`) with modified inputs.
- [ ] **Load real metrics.** `ClinicalReportModal` loads them from `/api/models`. `ResearchBench` shows an error state instead of fake numbers. The Navbar badge calls `/api/health`.
- [ ] **Change the default API URL** in `api.js` to `http://localhost:5000/api` and set `.env.example` to localhost.
- [ ] **Raise the default timeout** to 30 s and use polling for assessments (section 3.3).
- [ ] **Handle auth properly.** In `AuthContext`, clear the token only on a 401, not on network errors. Add a response interceptor that logs out and redirects on 401.
- [ ] **Small fixes**: confirm before delete in `PredictionTable`, add a Navbar title for `/research`, make `/about` public or remove its link from the landing page, and remove the commented-out legacy form in `PredictionForm.jsx`.

### 4.4 Security

- [ ] **Roles.** Add `role: "patient" | "doctor" | "admin"` to `User`. Only doctors can write reviews, and only on assessments assigned to them or shared with them.
- [ ] **Ownership checks** on every read, update, delete and file download (`{ _id, userId }` for patients, assignment check for doctors).
- [ ] **CORS allow-list** built from `CLIENT_URLS` (comma-separated env). Reject everything else.
- [ ] **Fail fast on secrets.** The server refuses to start in production without `JWT_SECRET` (at least 32 chars) and `MONGODB_URI`. Pass `algorithms: ["HS256"]` to `jwt.verify`.
- [ ] **Rate limiting** with `express-rate-limit`: strict on `/api/auth/*`, moderate on `/api/assessments` and `/api/ai/chat`.
- [ ] **Chatbot.** `/api/ai/chat` requires login. Cap message length at 2,000 chars. Send the Gemini key in the `x-goog-api-key` header instead of the URL. Pass the system prompt as `systemInstruction`. Update the model id to a currently supported Gemini model.
- [ ] **ML service is internal only.** Require a shared secret header (`X-Internal-Token`) from the backend and restrict its CORS.
- [ ] **Docker.** Don't publish MongoDB or ML service ports to the host, enable MongoDB auth, and keep secrets in an untracked `.env`.
- [ ] **Hide internals.** Gate Swagger UI behind `NODE_ENV !== "production"` or an admin login.
- [ ] **Hash passwords** with bcrypt cost ≥ 12 and cap password length at 72 bytes.

### 4.5 DevOps

- [ ] Add `backend/Dockerfile` (node:20-alpine, `npm ci --omit=dev`, non-root user).
- [ ] Add `frontend/Dockerfile` (multi-stage: build with Vite, serve with nginx).
- [ ] Update `docker-compose.yml`: drop the `version` key, use internal networks, add healthchecks, and add a `train` profile that runs training once.
- [ ] Add GitHub Actions CI: lint, backend tests, ML tests, frontend build.
- [ ] Add a root `Makefile` or npm scripts: `make train-survey`, `make test`, `make up`.

---

## 5. Model 1: Survey risk model

### 5.1 Purpose
Estimate lung-cancer risk from self-reported demographic, lifestyle and symptom data. The output is a calibrated probability plus a risk label at a pre-chosen threshold.

### 5.2 Data
- **Primary:** Kaggle "Lung Cancer" survey dataset, 309 rows. Exact duplicates are about 11% (33 rows), leaving 276 unique rows that are about 86% positive.
- **Upgrade if approved:** NLST participant data (CDAS), which has real smoking history (pack-years), demographics and confirmed outcomes.
- Record the dataset source, download date and SHA-256 hash in the metadata.

### 5.3 Cleaning
1. Normalize column names (existing code).
2. Map 1/2 encodings to 0/1 and YES/NO targets to 1/0 (existing code, with the dtype fix).
3. **Remove exact duplicates before any split.** Report counts before and after.
4. **Check for conflicting duplicates** (same features, different label) and report them.
5. Keep imputation inside the pipeline.

### 5.4 Pipeline
```
ColumnTransformer:
  AGE                → StandardScaler
  13 binary columns  → passthrough (already 0/1)
  GENDER             → OneHotEncoder(drop="if_binary")
→ (optional) SMOTE / RandomOverSampler  [imblearn Pipeline, training folds only]
→ feature selector
→ classifier
→ CalibratedClassifierCV
```
Use `imblearn.pipeline.Pipeline` so resampling only happens on training folds.

### 5.5 Feature-selection comparison
Run each method inside the inner cross-validation loop:

| Method | Implementation |
|---|---|
| None (all features) | baseline |
| Sequential forward selection (SFS) | the existing function, or `sklearn.feature_selection.SequentialFeatureSelector(direction="forward")` |
| Sequential backward selection | `SequentialFeatureSelector(direction="backward")` |
| Recursive feature elimination | `RFECV` |
| L1 / LASSO | `SelectFromModel(LogisticRegression(penalty="l1", solver="liblinear"))` |
| Mutual information | `SelectKBest(mutual_info_classif)` |
| Boruta (optional) | `boruta` package |

For each method, record the selected features in every outer fold and compute **selection stability** (average pairwise Jaccard index across folds).

### 5.6 Classifiers
- Logistic Regression (`class_weight="balanced"`)
- Decision Tree
- Random Forest (`class_weight="balanced"`)
- **Bagging Classifier** (decision trees), the project's main model
- SVM (RBF, `probability=True`)
- Gradient boosting: XGBoost or LightGBM
- Optional: CatBoost, k-NN, Naive Bayes

Tune hyperparameters in the inner loop with `GridSearchCV` or `RandomizedSearchCV`, using small grids because the dataset is small.

### 5.7 Evaluation protocol
- **Nested cross-validation:** outer loop is `RepeatedStratifiedKFold(n_splits=5, n_repeats=10)`; inner loop is `StratifiedKFold(5)` for feature selection, tuning and threshold choice.
- **Metrics** (mean ± SD across outer folds, plus 95% bootstrap CI on pooled out-of-fold predictions):
  - ROC-AUC, PR-AUC
  - Balanced accuracy
  - Sensitivity (recall), specificity
  - Precision (PPV), NPV
  - F1, MCC
  - Brier score and Expected Calibration Error (ECE)
- **Baselines** in the same table: a majority-class classifier (shows what "86% accuracy" really means) and a logistic regression on all features.
- **Significance:** DeLong test for AUC differences between the best model and Bagging, and corrected resampled t-test (Nadeau–Bengio) for cross-validated metrics.
- **Leakage demonstration** for the paper: report results with and without deduplication, and with a random single split versus nested CV.

### 5.8 Calibration and threshold
- Calibrate with `CalibratedClassifierCV(method="isotonic" or "sigmoid", cv=inner)` and show reliability diagrams before and after.
- Choose the threshold in the inner loop, either to reach sensitivity ≥ 0.90 (screening priority) or by Youden's J. Store the threshold in the metadata, and have the API return `threshold` together with the probability.

### 5.9 Explainability
- **Global:** SHAP summary (beeswarm) plot and mean |SHAP| bar chart over out-of-fold predictions. For BaggingClassifier use `shap.Explainer(model.predict_proba, masker=background)` (permutation explainer). For tree boosters use `TreeExplainer`.
- **Local, per prediction:** the ML service returns the top contributing features with signed SHAP values. These replace the hardcoded `featureContributions`.
- **Permutation importance** as a second check.

### 5.10 Guideline check (informational, rule-based)
The smoking follow-up already collects cigarettes per day and years smoked.
- Compute **pack-years** = (cigarettes per day ÷ 20) × years smoked.
- Show a separate **USPSTF 2021 eligibility** card: age 50–80, ≥ 20 pack-years, and currently smoking or quit within the past 15 years. The app needs a "years since quitting" question for this.
- Label it as a guideline check, not a model output. It's only evaluated against the model if NLST is available.

### 5.11 Artifacts
```
ml-service/artifacts/survey/v2.0.0/
  model.joblib
  metadata.json        # dataset hash, versions, seed, threshold, selected features, metrics with CIs
  feature_schema.json  # raw columns, types, allowed values
  shap_background.npy
  model_card.md
ml-service/results/survey/v2.0.0/
  nested_cv_results.csv, fold_selected_features.json, stability.json
  roc_pr_curves.png, calibration.png, shap_summary.png, confusion_matrix.png
```

### 5.12 API
`POST /v1/survey/predict`
```json
{ "GENDER": "M", "AGE": 65, "SMOKING": 1, "YELLOW_FINGERS": 1, "ANXIETY": 0,
  "PEER_PRESSURE": 0, "CHRONIC_DISEASE": 1, "FATIGUE": 1, "ALLERGY": 0,
  "WHEEZING": 1, "ALCOHOL_CONSUMING": 1, "COUGHING": 1,
  "SHORTNESS_OF_BREATH": 1, "SWALLOWING_DIFFICULTY": 0, "CHEST_PAIN": 1 }
```
Response:
```json
{ "module": "survey", "modelId": "survey-bagging", "modelVersion": "2.0.0",
  "probability": 0.81, "threshold": 0.62, "label": "High Risk",
  "explanation": [ { "feature": "COUGHING", "value": 1, "shap": 0.12 }, ... ],
  "calibrated": true }
```

### 5.13 Done when
- [ ] Training gives identical results on macOS, Linux (Kaggle/Colab) and Docker with the same seed.
- [ ] Nested-CV results table with CIs exists for every selector × classifier combination.
- [ ] The deployed model's metrics in `/v1/models` match the results files exactly.
- [ ] SHAP values in the app come from the deployed model.
- [ ] The model card is written.

---

## 6. Model 2: Chest X-ray nodule/mass model

### 6.1 Purpose
Estimate the probability that a frontal chest X-ray shows a **nodule** or **mass**, two radiographic findings that call for follow-up. It does not diagnose cancer.

### 6.2 Data
- **Training and internal test:** NIH ChestX-ray14, 112,120 frontal images from 30,805 patients, with 14 labels mined from reports by NLP. About 6,300 images are labelled Nodule and about 5,800 Mass. The dataset is hosted on Kaggle (`nih-chest-xrays/data`).
- **External test:** JSRT, 247 images (154 with a nodule, 93 without). It tests whether the model generalizes to another hospital and scanner type.
- **Optional second external test:** VinDr-CXR (PhysioNet, credentialed), with radiologist-annotated nodule/mass boxes.

### 6.3 Labels and task
- Train a **multi-label model on all 14 labels**, which usually helps the shared features, but show only Nodule and Mass in the app.
- Also report a combined "nodule or mass" binary output for the paper.
- State in the paper that ChestX-ray14 labels are NLP-derived and noisy.

### 6.4 Splits
- Use the **official patient-wise split** (`train_val_list.txt`, `test_list.txt`).
- Split `train_val` into train and validation **by patient id** (for example 90/10).
- Assert in code that no patient id appears in two splits.

### 6.5 Preprocessing and augmentation
- Convert to grayscale, resize to 224×224 (try 320 or 384 if compute allows), replicate to 3 channels, and normalize with ImageNet mean and std.
- Training augmentations: small rotation (±10°), small translation and scale, brightness and contrast jitter.
- No horizontal flip by default, because it moves the heart to the wrong side. Test it as an ablation if you want.

### 6.6 Model and training
- **Backbone:** DenseNet-121 pretrained on ImageNet (the CheXNet design). Compare with EfficientNet-B0 and ResNet-50.
- **Head:** 14 sigmoid outputs.
- **Loss:** `BCEWithLogitsLoss` with `pos_weight` per class, or focal loss as an ablation.
- **Optimizer and schedule:** AdamW, lr 1e-4, cosine schedule or reduce-on-plateau, batch 32–64, 10–20 epochs, early stopping on validation mean AUC.
- **Mixed precision** (`torch.cuda.amp`) on a Kaggle T4.
- **Seeds:** fix all seeds and run 3 seeds for the final model so you can report variance.

### 6.7 Evaluation
- Per-label ROC-AUC with 95% bootstrap CI on the official test set, focusing on Nodule and Mass.
- Sensitivity and specificity at a threshold chosen on the validation set.
- PR-AUC (important because positives are about 5%).
- External test on JSRT: Nodule AUC, with the domain-shift drop discussed.
- **Comparison with published baselines:** CheXNet (Rajpurkar et al., 2017) and Wang et al. (2017). Note that CheXNet used a different split, so compare carefully.
- **Ablations:** backbone, resolution, loss, pretraining, and augmentation on/off.

### 6.8 Explainability
- Grad-CAM on the last DenseNet block for the Nodule and Mass outputs.
- The app overlays the heatmap on the X-ray with an opacity slider.
- For the paper, use **pointing-game accuracy** on the ChestX-ray14 bounding-box subset (about 1,000 images with boxes, including nodules and masses): check whether the heatmap's peak falls inside the radiologist's box.

### 6.9 Input safety
- **Is it a chest X-ray?** Train a small binary gate classifier (chest X-ray vs. other images, using ChestX-ray14 against random non-medical images) and reject uploads that fail it.
- Accept PNG, JPEG and DICOM (read with `pydicom`, apply windowing, convert to 8-bit).
- Strip DICOM patient metadata before storage.

### 6.10 Export and serving
- Export to **ONNX** (`torch.onnx.export`) and serve with `onnxruntime` on CPU. That avoids installing full PyTorch on the server and keeps memory low.
- Expected CPU inference time is under 1 second per image. Measure it and report it in the paper.

### 6.11 API
`POST /v1/xray/predict` (multipart, field `image`)
```json
{ "module": "xray", "modelId": "cxr-densenet121", "modelVersion": "1.0.0",
  "findings": { "nodule": 0.34, "mass": 0.12 },
  "thresholds": { "nodule": 0.28, "mass": 0.25 },
  "flags": ["nodule_above_threshold"],
  "heatmaps": { "nodule": "<base64 PNG or storage key>" },
  "inputCheck": { "isChestXray": true, "score": 0.99 } }
```

### 6.12 Done when
- [ ] Patient-level split is verified by an automated check.
- [ ] Test and external-test AUCs with CIs are recorded in the model metadata.
- [ ] Grad-CAM overlays show in the app and pointing-game results exist.
- [ ] The ONNX model runs on CPU within the measured time.
- [ ] The model card is written.

---

## 7. Model 3: CT nodule malignancy model

### 7.1 Purpose
Given a CT scan and the location of a nodule, estimate how suspicious the nodule is for malignancy, as rated by radiologists. Most LIDC-IDRI nodules have no biopsy result, so the label is a radiologist consensus rating, not a confirmed diagnosis.

### 7.2 Data
- **LIDC-IDRI** (TCIA): 1,018 CT scans from 1,010 patients. Up to 4 radiologists annotated each nodule ≥ 3 mm and rated its malignancy from 1 (highly unlikely) to 5 (highly suspicious). The full download is about 124 GB. Read annotations with the `pylidc` library.
- **LUNA16:** a curated subset of 888 scans (slice thickness ≤ 2.5 mm) with 1,186 nodules accepted by at least 3 of 4 radiologists. It's smaller to download and is often hosted on Kaggle.
- Download only what you need. Start with LUNA16 or a LIDC subset for development.

### 7.3 Labels
- Cluster the annotations of the same nodule (`pylidc` `cluster_annotations`). Keep nodules annotated by ≥ 3 radiologists.
- Label = median malignancy rating: **1–2 → benign (0), 4–5 → malignant (1), 3 → excluded** (the usual practice).
- **Sensitivity analysis** for the paper: (a) include rating 3 as benign, (b) use the mean rating, (c) use regression on the 1–5 scale.
- Report the number of nodules per class and inter-reader agreement (Fleiss' kappa) as the "human ceiling".

### 7.4 Splits
- **Patient-level 5-fold cross-validation.** All nodules of one patient stay in one fold.
- Hold out 15% of patients as a final test set that is never used for tuning.

### 7.5 Preprocessing
1. Load the DICOM series (`pydicom`/`SimpleITK`) or LUNA16 `.mhd` files (`SimpleITK`).
2. Convert to Hounsfield units (HU) using rescale slope and intercept.
3. Resample to 1 mm isotropic spacing.
4. Clip to lung window [−1000, 400] HU and scale to [0, 1].
5. Extract a cube centred on the nodule centroid: 32×32×32 or 48×48×48 voxels.
6. Cache patches as `.npy` so training doesn't re-read DICOMs.

### 7.6 Augmentation
Random flips along all axes (fine for CT patches), 90° rotations, small shifts (±2 voxels), Gaussian noise, and intensity jitter. MONAI transforms (`RandFlipd`, `RandRotate90d`, `RandGaussianNoised`) handle all of these.

### 7.7 Models
| Model | Why |
|---|---|
| **Radiomics + Random Forest / Bagging** (pyradiomics features: shape, intensity, texture) | Classical baseline that links to the project's Bagging theme |
| **2.5D CNN**: three orthogonal central slices fed to a pretrained ResNet-18 or DenseNet-121 | Light and fast, can use ImageNet weights |
| **3D CNN**: MONAI `resnet18` (3D) or a small custom 3D CNN | Uses the full volume |
| Optional: multi-scale 3D CNN or 3D ViT | Only if time allows |

Training: AdamW, lr 1e-4–3e-4, batch 32–64 patches, 50–100 epochs (patches are small), early stopping on validation AUC, mixed precision, class-weighted BCE.

### 7.8 Evaluation
- ROC-AUC, PR-AUC, sensitivity, specificity, balanced accuracy and F1, with 95% CIs, reported per fold and pooled.
- Compare all models in one table, with DeLong tests between the best CNN and the radiomics baseline.
- Calibration plot.
- Ablations: patch size, 2.5D vs. 3D, augmentation on/off, and label definition (section 7.3).

### 7.9 Explainability
3D Grad-CAM shown on the axial, coronal and sagittal slices through the nodule centre.

### 7.10 How CT works in the app
Full CT studies are large (often 100+ MB of DICOM files), and automatic nodule detection is a separate, much harder project. The app therefore supports:
1. **Demo gallery:** pick a held-out LIDC-IDRI test nodule. This is the main demo path.
2. **Upload:** a zipped DICOM series (size limit, for example 300 MB). The backend renders axial slices, the user scrolls to the nodule and clicks its centre, and the ML service extracts the patch and predicts.
3. List automatic nodule detection (LUNA16 detection track) as **future work**.

### 7.11 API
`POST /v1/ct/predict` (multipart: `series` zip, `center` = `{"x":..,"y":..,"z":..}` in voxel or mm coordinates), or `{ "demoCaseId": "LIDC-0123-n1" }`
```json
{ "module": "ct", "modelId": "ct-nodule-3dresnet18", "modelVersion": "1.0.0",
  "malignancySuspicion": 0.71, "threshold": 0.5,
  "labelDefinition": "radiologist median rating ≥4 vs ≤2 (LIDC-IDRI)",
  "heatmaps": { "axial": "...", "coronal": "...", "sagittal": "..." } }
```

### 7.12 Done when
- [ ] The patch extraction script reproduces the nodule counts reported in the results.
- [ ] Patient-level cross-validation results with CIs exist for the radiomics baseline, the 2.5D model and the 3D model.
- [ ] The demo gallery works end to end.
- [ ] The model card is written.

---

## 8. Model 4: Report analysis model

### 8.1 Purpose
Read a radiology report (PDF, photo or pasted text) and extract structured findings, with the exact sentence each finding came from. This replaces the current keyword check in `backend/src/services/reportAnalysisService.js`.

### 8.2 Data
- **IU X-ray / OpenI:** about 3,955 de-identified chest X-ray reports (with about 7,470 images). They have "findings" and "impression" sections plus MeSH/"Problems" tags, which can serve as weak labels. A Kaggle copy exists ("Chest X-rays (Indiana University)").
- **Optional:** MIMIC-CXR reports (PhysioNet credentialing required).
- **Synthetic PDFs and photos for OCR testing:** render IU reports into PDF and image layouts (different fonts, scan noise, rotation) with known ground truth.

### 8.3 Extraction schema
```json
{
  "nodule":        { "status": "present | absent | uncertain | not_mentioned",
                     "size_mm": null, "location": "RUL | RML | RLL | LUL | LLL | lingula | unspecified",
                     "evidence": "quoted sentence" },
  "mass":          { "status": "...", "size_mm": null, "location": "...", "evidence": "..." },
  "suspicious_for_malignancy": { "status": "...", "evidence": "..." },
  "lymphadenopathy":           { "status": "...", "evidence": "..." },
  "pleural_effusion":          { "status": "...", "evidence": "..." },
  "recommendation": { "type": "none | follow_up_ct | pet_ct | biopsy | other", "evidence": "..." },
  "comparison_with_prior": { "status": "new | stable | increased | decreased | not_mentioned" }
}
```

### 8.4 Gold-standard annotation
- Manually annotate **300 reports** with the schema: 200 for test, 100 for few-shot examples and development.
- Use **two annotators** (you plus a teammate, ideally checked by a doctor). Compute Cohen's kappa per field and resolve disagreements.
- Write an annotation guideline (one page) and include it as a paper appendix or in the repo.

### 8.5 Pipeline
1. **Text extraction:** PDF text layer (`pdfplumber` / `pypdf`) first. If there's no text layer, OCR it with Tesseract (`pytesseract`) or docTR. Move OCR into the ML service so all document processing is in one place.
2. **Section splitting:** find "Findings", "Impression" and "Recommendation" headings.
3. **Extraction:** three approaches, compared in the paper.

| Approach | Details |
|---|---|
| A. Rules + negation detection | Regex patterns for each finding, NegEx-style negation and uncertainty cues ("no", "without", "possible", "cannot exclude"), and a size regex (`\d+(\.\d+)?\s?(mm\|cm)`) |
| B. Fine-tuned transformer | `Bio_ClinicalBERT` or `RadBERT`. Sentence-level classification per field (present/absent/uncertain), plus token classification for size and location. Train on weak labels from MeSH tags plus the 100 dev reports |
| C. LLM extraction | Gemini (or a local open model) with the JSON schema, 5–10 few-shot examples, and an instruction to quote evidence verbatim. Validate output against the schema and reject any evidence string that doesn't appear in the source text |

4. **Post-check:** every `evidence` string must be an exact substring of the report text. Otherwise the field is set to `uncertain`.

### 8.6 Evaluation
- Per field: precision, recall and F1 for each status. Macro-F1 across fields.
- Size: exact-match rate and mean absolute error in mm.
- Negation accuracy (a key known weakness of keyword methods).
- **OCR robustness:** run the same 200 test reports as clean text, clean PDF, and degraded photo, and report the F1 drop at each stage.
- **Cost and latency** per report for each approach.
- **Privacy note:** approach C sends text to an external API. Use only public or synthetic reports, or switch to a locally hosted model.

### 8.7 API
`POST /v1/report/analyze` (multipart `file`, or JSON `{ "text": "..." }`)
```json
{ "module": "report", "modelId": "report-extractor", "modelVersion": "1.0.0",
  "engine": "bioclinicalbert | rules | llm",
  "textSource": "pdf_text | ocr",
  "ocrConfidence": 0.91,
  "findings": { ...schema above... } }
```

### 8.8 Done when
- [ ] 300 annotated reports with kappa reported.
- [ ] The A/B/C comparison table and OCR robustness table exist.
- [ ] Every extracted finding in the app shows its quoted evidence.
- [ ] The old keyword check is removed from the backend.

---

## 9. ML service restructure

### 9.1 Folder layout
```
ml-service/
├── app/
│   ├── main.py                 # FastAPI app, lifespan loads registry
│   ├── config.py               # pydantic-settings
│   ├── registry.py             # reads artifacts/registry.json, loads models lazily, thread-safe
│   ├── security.py             # X-Internal-Token check
│   ├── api/
│   │   ├── survey.py           # /v1/survey/*
│   │   ├── xray.py             # /v1/xray/*
│   │   ├── ct.py               # /v1/ct/*
│   │   ├── report.py           # /v1/report/*
│   │   └── models.py           # /v1/models, /health
│   ├── modules/
│   │   ├── survey/  (schema.py, inference.py, explain.py)
│   │   ├── xray/    (preprocess.py, inference.py, gradcam.py, gate.py)
│   │   ├── ct/      (dicom_io.py, patch.py, inference.py, gradcam.py)
│   │   └── report/  (ocr.py, sections.py, rules.py, transformer.py, llm.py)
│   └── common/ (images.py, errors.py, logging.py)
├── training/
│   ├── survey/  train.py, nested_cv.py, feature_selection.py, report.py
│   ├── xray/    train.ipynb (Kaggle), export_onnx.py, evaluate.py
│   ├── ct/      extract_patches.py, train.ipynb, radiomics_baseline.py, evaluate.py
│   └── report/  annotate_guide.md, train_bert.ipynb, eval_extractors.py, make_synthetic_pdfs.py
├── artifacts/
│   ├── registry.json
│   ├── survey/v2.0.0/ ...
│   ├── xray/v1.0.0/  model.onnx, gate.onnx, metadata.json, model_card.md
│   ├── ct/v1.0.0/    model.onnx, metadata.json, model_card.md
│   └── report/v1.0.0/ model.onnx (or HF folder), metadata.json, model_card.md
├── tests/
├── requirements-serve.txt
├── requirements-train.txt
└── Dockerfile
```

### 9.2 Model registry (`artifacts/registry.json`)
```json
{
  "survey": { "active": "2.0.0", "path": "survey/v2.0.0" },
  "xray":   { "active": "1.0.0", "path": "xray/v1.0.0" },
  "ct":     { "active": "1.0.0", "path": "ct/v1.0.0" },
  "report": { "active": "1.0.0", "path": "report/v1.0.0" }
}
```
`GET /v1/models` returns each model's metadata (dataset, metrics with CIs, threshold, version, trained date) so the frontend never hardcodes numbers.

### 9.3 Storing large weights
Don't commit large weights to Git. Store them as Kaggle Dataset or Hugging Face Hub model files. A download script (`scripts/fetch_artifacts.py`) checks SHA-256 hashes against `registry.json`.

### 9.4 Model cards
Each model gets a `model_card.md` (based on Mitchell et al., 2019, "Model Cards for Model Reporting") covering:
- intended use and out-of-scope uses
- training data
- evaluation data and metrics with CIs
- subgroup results (sex and age where available)
- limitations and ethical considerations

The app shows the model card behind an "About this model" link on each result card.

---

## 10. Backend changes

### 10.1 New routes
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/assessments` | patient | Create an assessment (multipart: `survey` JSON, `xray`, `ctSeries`, `ctCenter`, `report`) and return 202 with the id |
| GET | `/api/assessments` | patient | List own assessments (summary only, no file data) |
| GET | `/api/assessments/:id` | owner / assigned doctor | Full assessment with per-module status and results |
| DELETE | `/api/assessments/:id` | owner | Delete the assessment, its files and heatmaps |
| GET | `/api/assessments/:id/files/:fileId` | owner / assigned doctor | Stream a file after an ownership check (short-lived signed URL in production) |
| POST | `/api/assessments/:id/share` | owner | Assign a doctor |
| PATCH | `/api/assessments/:id/review` | assigned doctor | Write clinical notes and review status |
| POST | `/api/survey/simulate` | patient | Real What-If: re-run the survey model with changed inputs (not saved) |
| GET | `/api/models` | any logged-in user | Proxy of `/v1/models` |
| GET | `/api/ct/demo-cases` | any logged-in user | List of demo CT nodules |
| GET | `/api/health` | public | Checks MongoDB and the ML service |

Keep `/api/predictions` working during migration, then remove it.

### 10.2 Uploads
- Use **Multer** with `memoryStorage` for small files and disk storage in a private temp directory for CT zips.
- Limits: X-ray ≤ 10 MB, report ≤ 10 MB, CT zip ≤ 300 MB, at most 4 files per request.
- Validate magic bytes (`file-type` package), not just the browser's MIME type.
- Generate random storage keys (UUID). Never use the original filename as a path.
- Strip EXIF and DICOM patient tags before storage.

### 10.3 Storage
- **Development:** a private `backend/storage/` directory, gitignored and never served statically.
- **Deployment:** private object storage (for example Cloudflare R2, AWS S3 or Supabase Storage) with server-side encryption and short-lived signed URLs.
- Write a `storageService` interface (`put`, `getStream`, `delete`, `signedUrl`) so switching providers needs no other code changes.

### 10.4 MongoDB schema (`models/Assessment.js`)
```js
{
  userId:        { type: ObjectId, ref: "User", required: true, index: true },
  assignedDoctorIds: [{ type: ObjectId, ref: "User" }],
  status: { type: String, enum: ["processing", "completed", "partial", "failed"] },
  modules: {
    survey: {
      requested: Boolean,
      input: Object,          // validated 15 fields
      details: Object,        // follow-up answers
      guideline: { packYears: Number, uspstfEligible: Boolean },
      status: { type: String, enum: ["skipped","pending","done","error"] },
      result: { probability: Number, threshold: Number, label: String, explanation: Array },
      model: { id: String, version: String },
      error: String
    },
    xray:   { requested: Boolean, file: FileRef, status: String,
              result: { nodule: Number, mass: Number, flags: [String], heatmapKeys: Object },
              model: { id: String, version: String }, error: String },
    ct:     { requested: Boolean, file: FileRef, center: Object, demoCaseId: String, status: String,
              result: { malignancySuspicion: Number, threshold: Number, heatmapKeys: Object },
              model: { id: String, version: String }, error: String },
    report: { requested: Boolean, file: FileRef, status: String,
              result: { findings: Object, textSource: String, ocrConfidence: Number },
              model: { id: String, version: String, engine: String }, error: String }
  },
  review: { reviewerId: ObjectId, notes: String, status: { type: String, enum: ["pending","reviewed"] }, reviewedAt: Date },
  timestamps: true
}
// FileRef = { storageKey, originalName, contentType, size, sha256 }
```
Store references and metadata only. Never store file bytes or long OCR text in MongoDB.

### 10.5 Processing
- **First version:** after saving the assessment, run the module calls in the background inside the backend process (`Promise.allSettled`) and update each module's status as it finishes.
- **If load grows:** move to a job queue (BullMQ + Redis) with retries and a worker process.
- Record each module's processing time for the paper's system evaluation.

### 10.6 Audit log
Keep a small `AuditLog` collection: who viewed, downloaded, reviewed or deleted which assessment, and when.

### 10.7 Swagger
Document every new route, including multipart schemas, 202/503 responses and the error shape.

---

## 11. Frontend changes

### 11.1 Assessment page (`/assess`)
A stepper or tabs: **1. Survey → 2. Chest X-ray → 3. CT → 4. Report → Review & submit.**
- Each imaging or report step starts with a Yes/No question ("Do you have a chest X-ray to upload?"). Choosing **No** skips the step and clears any file after confirmation.
- Show accepted formats, size limit and a preview (image thumbnail, PDF first page, CT slice viewer).
- The CT step offers a **demo case gallery** and an upload with a slice slider and click-to-mark nodule centre.
- The review step lists what will be analysed and repeats the disclaimer.
- Submit sends `FormData`, then navigates to `/assessments/:id`.

### 11.2 Result page (`/assessments/:id`)
- **Status bar** per module: pending, done, error or skipped (polling every 2 s).
- **Survey card:** calibrated probability with a gauge, the threshold, label, SHAP bar chart of top features, the USPSTF guideline card, and the real What-If simulator.
- **X-ray card:** the image with a Grad-CAM overlay toggle and opacity slider, nodule and mass probabilities against their thresholds, and "Not a chest X-ray" handling.
- **CT card:** three orthogonal slices with heatmaps, the suspicion score, and the label definition.
- **Report card:** a findings table (status, size, location) with the evidence sentence highlighted, plus the text source and OCR confidence.
- Each card has an **"About this model"** link (model card, dataset, metrics with CIs).
- A fixed banner explains that the modules are independent and that no combined diagnosis is produced.
- **Doctor panel** (doctor role only): notes and a "reviewed" status.
- **Printable report** built only from real data.

### 11.3 Other pages
- **Dashboard:** counts per module, recent assessments, and model status from `/api/health`.
- **History:** a list of assessments with module badges, filters and delete with confirmation.
- **Research page:** real nested-CV tables, feature-selection stability, X-ray and CT ROC curves, and report-extraction tables, all loaded from `/api/models` and the results endpoints.
- **Model cards page:** all four cards.
- **Doctor inbox** (doctor role): assessments shared with them.

### 11.4 Technical
- Split the 1,200-line `PredictionForm.jsx` into components: `SurveyStep`, `FollowUpCard`, `UploadStep`, `CtViewer`, `ReviewStep`.
- Keep follow-up schemas and file rules in one shared config. Serve it from `/api/config/assessment-schema` so frontend and backend can't drift.
- Add ESLint, Prettier, and Vitest with React Testing Library.

---

## 12. Data, ethics and privacy

- **Dataset licences:** record each dataset's licence and terms in `DATASETS.md`, and follow them. PhysioNet and CDAS data may not be redistributed or uploaded to public notebooks.
- **No real patient data** in demos, tests or screenshots.
- **De-identification:** strip DICOM tags (`pydicom` anonymization) and image EXIF on upload.
- **Retention:** let users delete assessments, and delete files with them. Set an automatic deletion period (for example 30 days) in the demo deployment.
- **Consent screen** before the first assessment: explains what is stored, for how long, who can see it, and that results are not a diagnosis.
- **Wording:** never say "you have cancer" or "cancer detected". Use "finding suggestive of a nodule", "higher estimated risk" or "consult a doctor".
- **Bias:** report survey model results by sex and age group, and X-ray results by sex and age bins (ChestX-ray14 provides both).
- **Urgent symptoms:** keep the chest-pain urgent notice and add guidance to seek immediate care.

---

## 13. Testing

| Layer | Tool | What to test |
|---|---|---|
| ML (unit) | pytest | Cleaning and dtype handling, no duplicates across folds, patient-level split assertion, feature selection determinism, schema validation, GENDER normalization |
| ML (model) | pytest | Each model loads from the registry; a fixed fixture input gives a known output (regression test); ONNX output matches the PyTorch output within 1e-4 |
| ML (API) | pytest + httpx `TestClient` | 200/422/503 responses for each endpoint, internal-token check, oversized and invalid files |
| Backend | Jest + Supertest + mongodb-memory-server | Auth, roles, ownership on every route, multipart validation, assessment lifecycle, ML failure gives 503 (no fake result), file deletion |
| Frontend | Vitest + React Testing Library | Yes/No step logic, file validation, polling and status display, error states, no hardcoded metrics |
| End to end | Playwright | Register → assess (survey + X-ray demo) → see results → doctor review |
| Fixtures | — | Synthetic survey rows, public sample X-rays and LIDC demo patches, synthetic report PDFs. No real patient data |

Run all of these in GitHub Actions on every push.

---

## 14. Free deployment

| Part | Free option | Notes |
|---|---|---|
| Frontend | Vercel (already used) | Set `VITE_API_URL` to the backend URL |
| Backend | Render free web service (already used) | Free instances sleep when idle, so the first request after sleep is slow |
| ML service | Hugging Face Spaces (Docker, CPU) | More memory than Render free, which suits ONNX models. Protect it with the internal token |
| Database | MongoDB Atlas free cluster (M0) | Restrict network access, use a strong password |
| File storage | Cloudflare R2 / Supabase Storage free tier | Private bucket and signed URLs |
| Training | Your Mac (survey model), Kaggle Notebooks (X-ray, CT, BERT) | About 30 free GPU hours per week on Kaggle |
| Model weights | Hugging Face Hub or Kaggle Datasets | Download at startup and verify hashes |

Check each provider's current free-tier limits before relying on them.

---

## 15. Timeline (16 weeks)

| Week | Work |
|---|---|
| 1–2 | Phase 0 fixes (4.1–4.5). **Apply for NLST access through CDAS.** Start the related-work reading list |
| 3–4 | Model 1: nested CV, feature-selection comparison, calibration, SHAP, new API |
| 5–7 | Model 2: Kaggle training, external JSRT test, Grad-CAM, input gate, ONNX export, API |
| 8–10 | Model 3: patch extraction, radiomics baseline, 2.5D and 3D models, demo gallery, API |
| 11–12 | Model 4: annotate 300 reports, rules, BERT and LLM extractors, OCR robustness test, API |
| 13–14 | Backend assessments, uploads and storage; frontend stepper and result cards; roles and doctor panel |
| 15 | Tests, CI, deployment, model cards, demo script |
| 16 | Paper final draft, figures, submission (writing starts in week 3, see the paper plan) |

**If time is short:** drop CT (weeks 8–10) and spend the time on the paper and testing.

---

## 16. Risks and fallbacks

| Risk | Fallback |
|---|---|
| NLST not approved in time | Keep the modular design with no fusion. Mention NLST fusion as future work |
| Kaggle GPU quota runs out | Lower image resolution, train fewer epochs, use the Colab free tier as a second quota |
| X-ray AUC lower than published results | Report it honestly with CIs. Compare on the same official split. Analyse errors with Grad-CAM |
| CT download too large | Use LUNA16 or a subset of LIDC-IDRI patients, and state the subset in the paper |
| Not enough time to annotate 300 reports | Annotate 150 (100 test, 50 dev) and report wider CIs |
| Gemini API limits or terms | Use rules + BERT only, or a small local open model |
| Free hosting memory limits | ONNX + CPU, lazy-load models, put the ML service on Hugging Face Spaces |

---

## 17. Final checklist (definition of done)

- [ ] No hardcoded or simulated metric, probability or explanation appears anywhere in the app.
- [ ] All four models are registered, versioned and documented with model cards.
- [ ] Every number in the paper can be regenerated by a script in `ml-service/training/`.
- [ ] Every API route has ownership and role checks, and tests prove them.
- [ ] Uploads are private, validated, de-identified and deletable.
- [ ] `docker compose up` runs the whole system locally, and CI passes.
- [ ] The deployed demo works with public data only.
- [ ] README, Swagger, `DATASETS.md`, model cards and the project report are updated.
