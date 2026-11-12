---
title: PulmoDetect Survey Model
emoji: 🫁
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 8000
pinned: false
short_description: Lung cancer risk estimate from survey answers
---

# PulmoDetect-Survey v2.0.0

FastAPI service for the survey-based lung cancer **risk** model used by the PulmoDetect app. It takes 15 survey answers (gender, age and 13 yes/no lifestyle and symptom questions) and returns a risk label and a probability.

> **Not a medical device.** This model is for education and research only. It estimates risk from self-reported answers. It does not detect or diagnose lung cancer, and its output must not be used for medical decisions. Anyone with health concerns should consult a qualified doctor.

## Model

| | |
|---|---|
| Model ID | `pulmodetect-survey`, version 2.0.0 |
| Algorithm | `BaggingClassifier`: 100 decision trees, `class_weight="balanced"` |
| Feature selection | Sequential forward selection, scored by balanced accuracy with 5-fold cross-validation on the training set only, using a depth-4 decision tree with `class_weight="balanced"` |
| Features used | 4 of 16 encoded features: `ALLERGY`, `SWALLOWING_DIFFICULTY`, `PEER_PRESSURE`, `COUGHING` |
| Preprocessing | `AGE` and the 13 yes/no columns are standardized, and `GENDER` is one-hot encoded (fit on the training split) |
| Decision threshold | Probability ≥ 0.5 gives `High Risk` |
| Trained | 12 November 2026, Google Colab |
| Libraries | scikit-learn 1.6.1, numpy 2.4.6, pandas 2.2.3, joblib 1.6.0 |

The API returns `modelName: "BaggingClassifier"`.

## Training data

- **Source:** the public "Lung Cancer" survey dataset on Kaggle (`mysarahmadbhat/lung-cancer`). Check its licence before reusing it.
- **Size:** 309 rows. 33 exact duplicates were removed, leaving **276 rows**.
- **Class balance after deduplication:** 86.2% positive (`LUNG_CANCER = YES`).
- **Split:** stratified 80/20 (220 training rows, 56 test rows), `random_state=42`.
- Columns: `GENDER`, `AGE`, `SMOKING`, `YELLOW_FINGERS`, `ANXIETY`, `PEER_PRESSURE`, `CHRONIC_DISEASE`, `FATIGUE`, `ALLERGY`, `WHEEZING`, `ALCOHOL_CONSUMING`, `COUGHING`, `SHORTNESS_OF_BREATH`, `SWALLOWING_DIFFICULTY`, `CHEST_PAIN`, plus the target `LUNG_CANCER`.

The dataset is not included in this Space.

## Evaluation

### Nested cross-validation (main estimate)

Outer loop: 5-fold stratified cross-validation repeated 10 times (50 folds). Inner loop: feature selection and hyperparameter tuning. Values are mean ± SD across outer folds.

| Metric | Result |
|---|---|
| ROC-AUC | 0.856 ± 0.084 |
| PR-AUC (average precision) | 0.968 ± 0.023 |
| Balanced accuracy | 0.775 ± 0.092 |
| Recall (sensitivity) | 0.822 ± 0.073 |
| Brier score | 0.137 ± 0.043 |

This pipeline closely follows the deployed model's recipe, but it isn't identical: it uses scikit-learn's `SequentialFeatureSelector` and tunes `max_samples` and tree depth. Treat these numbers as the estimate of how the method performs on new data.

### Held-out test set (deployed model)

56 rows: 48 positive, 8 negative.

| Metric | Result |
|---|---|
| ROC-AUC | 0.922 |
| Accuracy | 0.857 |
| Precision | 1.000 |
| Recall (sensitivity) | 0.833 (40 of 48) |
| Specificity | 1.000 (8 of 8) |
| F1 | 0.909 |

With only 8 negative cases, one error changes specificity by 12.5 points. These numbers are less reliable than the nested-CV results.

## API

Interactive docs: `/docs`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service status |
| GET | `/model/info` | Model metadata and test metrics |
| GET | `/features` | Raw input columns and selected features |
| POST | `/predict` | Risk prediction for one person |
| GET | `/results/model-comparison` | Baseline model comparison, with and without feature selection |
| GET | `/results/feature-elimination` | Step-by-step feature-selection history |

### Input

All 15 fields are required, even though the model uses only 4 of them.

| Field | Type | Allowed values |
|---|---|---|
| `GENDER` | string | `"M"` or `"F"` (uppercase) |
| `AGE` | integer | 1–120 |
| `SMOKING`, `YELLOW_FINGERS`, `ANXIETY`, `PEER_PRESSURE`, `CHRONIC_DISEASE`, `FATIGUE`, `ALLERGY`, `WHEEZING`, `ALCOHOL_CONSUMING`, `COUGHING`, `SHORTNESS_OF_BREATH`, `SWALLOWING_DIFFICULTY`, `CHEST_PAIN` | integer | `0` = No, `1` = Yes |

### Example

```bash
curl -X POST https://<your-hf-username>-pulmodetect-survey.hf.space/predict \
  -H "Content-Type: application/json" \
  -d '{"GENDER":"M","AGE":65,"SMOKING":1,"YELLOW_FINGERS":1,"ANXIETY":0,
       "PEER_PRESSURE":0,"CHRONIC_DISEASE":1,"FATIGUE":1,"ALLERGY":0,
       "WHEEZING":1,"ALCOHOL_CONSUMING":1,"COUGHING":1,
       "SHORTNESS_OF_BREATH":1,"SWALLOWING_DIFFICULTY":0,"CHEST_PAIN":1}'
```

Response:

```json
{ "prediction": "Low Risk", "probability": 0.2476, "modelName": "BaggingClassifier" }
```

This person smokes, is 65 and has several symptoms, yet the model says Low Risk. It uses only allergy, swallowing difficulty, peer pressure and coughing, and of those this person has only coughing. See the limitations below.

## Limitations

- **Small, self-reported dataset.** 276 unique rows, from a public survey with unclear collection methods. It is not a clinical or screening cohort.
- **Class imbalance.** 86% of rows are positive, so the dataset has few negative examples to learn from.
- **Selected features ignore known risk factors.** Smoking and age were not selected, and predictions depend only on the 4 features listed above. This reflects quirks of this dataset, not medical evidence.
- **Probabilities are not calibrated.** The cross-validated Brier score (0.137) is worse than always predicting the base rate of 86% (0.119). Read the probability as a ranking score, not as a true chance of having cancer.
- **No external validation.** The model has only been tested on data from the same survey.
- **No authentication.** This public Space accepts requests from anyone. It is intended to be called by the PulmoDetect backend.

## Reproducing

From the project repository:

```bash
cd ml-service
pip install -r requirements.txt
python scripts/train.py                              # deployed model and artifacts
PYTHONPATH=. python training/survey/nested_cv.py 10  # nested cross-validation results
```

Use the library versions listed above. The `.joblib` files load reliably only with the same scikit-learn version that saved them.
