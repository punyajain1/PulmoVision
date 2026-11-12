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

# PulmoDetect-Survey v2.1.0

FastAPI service for the survey-based lung cancer **risk** model used by the PulmoDetect app. It takes 15 survey answers (gender, age and 13 yes/no lifestyle and symptom questions) and returns:

- a calibrated probability and a risk label from a screening threshold,
- an uncertainty range from the spread of the model's trees,
- a conformal prediction check and an unusual-input check, combined into a `lowConfidence` flag,
- exact SHAP values explaining the prediction.

> **Not a medical device.** This model is for education and research only. It estimates risk from self-reported answers. It does not detect or diagnose lung cancer, and its output must not be used for medical decisions. Anyone with health concerns should consult a qualified doctor.

## Model

| | |
|---|---|
| Model ID | `pulmodetect-survey`, version 2.1.0 |
| Algorithm | `BaggingClassifier`: 100 decision trees, `class_weight="balanced"`, wrapped in sigmoid (Platt) calibration |
| Feature selection | Sequential forward selection, scored by balanced accuracy with 5-fold cross-validation on the training set only, using a depth-4 decision tree with `class_weight="balanced"` |
| Features used | 4 of 16 encoded features: `ALLERGY`, `SWALLOWING_DIFFICULTY`, `PEER_PRESSURE`, `COUGHING` |
| Preprocessing | `AGE` and the 13 yes/no columns are standardized, and `GENDER` is one-hot encoded (fit on the training split) |
| Decision threshold | Calibrated probability ≥ **0.6469** gives `High Risk` |
| Trained | 12 November 2026, Python 3.11.14, `random_state=42` |
| Libraries | scikit-learn 1.6.1, numpy 2.4.6, pandas 2.2.3, joblib 1.6.0 |

The API returns `modelName: "BaggingClassifier"` and `modelVersion: "2.1.0"`.

Version 2.1.0 uses the same underlying Bagging model as 2.0.0 (same trees, same ROC-AUC). It adds calibration, the screening threshold, uncertainty, conformal prediction and the unusual-input check.

## Training data

- **Source:** the public "Lung Cancer" survey dataset on Kaggle (`mysarahmadbhat/lung-cancer`). Check its licence before reusing it.
- **Size:** 309 rows. 33 exact duplicates were removed, leaving **276 rows**.
- **Class balance after deduplication:** 86.2% positive (`LUNG_CANCER = YES`). In the training split: 190 positive, 30 negative (86.4%).
- **Split:** stratified 80/20 (220 training rows, 56 test rows), `random_state=42`.
- Columns: `GENDER`, `AGE`, `SMOKING`, `YELLOW_FINGERS`, `ANXIETY`, `PEER_PRESSURE`, `CHRONIC_DISEASE`, `FATIGUE`, `ALLERGY`, `WHEEZING`, `ALCOHOL_CONSUMING`, `COUGHING`, `SHORTNESS_OF_BREATH`, `SWALLOWING_DIFFICULTY`, `CHEST_PAIN`, plus the target `LUNG_CANCER`.

The dataset is not included in this service. `artifacts/shap_background.npy` holds the 220 training rows' values for the 4 selected features (standardized), used as the SHAP reference.

## Reliability methods

Everything below is fitted on the **training split only**, from 5-fold out-of-fold (OOF) predictions, so the test set stays untouched. Code: `app/services/reliability_service.py`. Fitted values: `artifacts/reliability.json`.

| Method | What it does | Fitted value |
|---|---|---|
| **Calibration** | Sigmoid (Platt) scaling fitted on OOF scores (`CalibratedClassifierCV`, `ensemble=False`). Corrects the distortion from `class_weight="balanced"` | OOF Brier 0.1468 → **0.0969**; OOF ECE 0.162 → **0.042** |
| **Threshold** | Highest threshold with OOF sensitivity ≥ 90% | 0.6469 (OOF sensitivity 0.90, specificity 0.40) |
| **Uncertainty** | 10th–90th percentile of the 100 bootstrap trees' calibrated probabilities | per prediction |
| **Conformal prediction** | Class-conditional (Mondrian) cross-conformal, 80% coverage per class. `confident` only when the set is exactly the threshold label | q(High) 0.1455, q(Low) 0.9309 |
| **Unusual input** | Age outside the 1st–99th percentile of training ages, or fewer than 5 training rows with the same answers on the 4 used features | ages 44.4–80.6 |

`lowConfidence` is true when the conformal check is not `confident` or the input is unusual.

**The probability is calibrated to this dataset, where 86% of participants had lung cancer.** It is not a person's real-world chance of having lung cancer, which is far lower in the general population. Calibrated probabilities here range from about 0.54 to 0.96, which is why the threshold is 0.65 rather than 0.5.

Conformal coverage at 90% was also tested: the model returned both labels for 52 of 56 test cases, which is uninformative, so 80% is used.

## Evaluation

### Nested cross-validation (main performance estimate)

Outer loop: 5-fold stratified cross-validation repeated 10 times (50 folds). Inner loop: feature selection and hyperparameter tuning. Values are mean ± SD across outer folds. Uncalibrated, threshold-free metrics.

| Metric | Result |
|---|---|
| ROC-AUC | 0.856 ± 0.084 |
| PR-AUC (average precision) | 0.968 ± 0.023 |
| Balanced accuracy | 0.775 ± 0.092 |
| Recall (sensitivity) | 0.822 ± 0.073 |
| Brier score | 0.137 ± 0.043 |

This pipeline closely follows the deployed model's recipe but isn't identical (it uses scikit-learn's `SequentialFeatureSelector` and tunes `max_samples` and tree depth), and it does not include calibration.

### Held-out test set (deployed model, v2.1.0)

56 rows: 48 positive, 8 negative.

| Metric | At threshold 0.6469 (deployed) | v2.0.0 (uncalibrated, threshold 0.5) |
|---|---|---|
| ROC-AUC | 0.922 | 0.922 |
| PR-AUC | 0.985 | n/a |
| Sensitivity | **0.979** (47 of 48) | 0.833 (40 of 48) |
| Specificity | **0.375** (3 of 8) | 1.000 (8 of 8) |
| Balanced accuracy | 0.677 | 0.917 |
| Accuracy | 0.893 | 0.857 |
| Precision | 0.904 | 1.000 |
| F1 | 0.940 | 0.909 |
| Brier score | **0.081** | 0.094 |
| ECE | 0.138 | n/a |

The threshold trades specificity for sensitivity, which is the intended screening behaviour: on this test set it finds 7 more positive cases and raises 5 more false alarms. With only 8 negative cases, one error changes specificity by 12.5 points, so these numbers are much less reliable than the cross-validation results.

### Reliability on the test set

| | Result |
|---|---|
| Conformal coverage (target 80%) | High Risk: 0.833; Low Risk: 1.000 |
| Conformal sets | 47 single label, 9 both labels, 0 empty |
| Predictions marked confident | 32 of 56 |
| **Error rate, confident predictions** | **3.1%** (1 of 32) |
| **Error rate, low-confidence predictions** | **20.8%** (5 of 24) |
| Mean tree range (10th–90th percentile), correct predictions | 0.054 |
| Mean tree range, wrong predictions | 0.257 |
| Inputs flagged as unusual | 7.1% |

The low-confidence flag and the uncertainty range both pick out the model's likely mistakes: 5 of the 6 test-set errors are in the low-confidence group. With 56 test rows these are small counts, so treat them as indicative.

## API

Interactive docs: `/docs`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service status |
| GET | `/model/info` | Model metadata, test metrics and test-set reliability |
| GET | `/features` | Raw input columns and selected features |
| POST | `/predict` | Risk prediction for one person. `?explain=false` skips SHAP (used by the app's What-If simulator) |
| GET | `/results/model-comparison` | Baseline model comparison, with and without feature selection |
| GET | `/results/feature-elimination` | Step-by-step feature-selection history |

### Input

All 15 fields are required, even though the model uses only 4 of them.

| Field | Type | Allowed values |
|---|---|---|
| `GENDER` | string | `"M"` or `"F"` |
| `AGE` | integer | 1–120 |
| `SMOKING`, `YELLOW_FINGERS`, `ANXIETY`, `PEER_PRESSURE`, `CHRONIC_DISEASE`, `FATIGUE`, `ALLERGY`, `WHEEZING`, `ALCOHOL_CONSUMING`, `COUGHING`, `SHORTNESS_OF_BREATH`, `SWALLOWING_DIFFICULTY`, `CHEST_PAIN` | integer | `0` = No, `1` = Yes |

### Example

```bash
curl -X POST https://pulmodetect-ml.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"GENDER":"M","AGE":65,"SMOKING":1,"YELLOW_FINGERS":1,"ANXIETY":0,
       "PEER_PRESSURE":0,"CHRONIC_DISEASE":1,"FATIGUE":1,"ALLERGY":0,
       "WHEEZING":1,"ALCOHOL_CONSUMING":1,"COUGHING":1,
       "SHORTNESS_OF_BREATH":1,"SWALLOWING_DIFFICULTY":0,"CHEST_PAIN":1}'
```

Response (shortened):

```json
{
  "prediction": "High Risk",
  "probability": 0.6604,
  "calibrated": true,
  "threshold": 0.6469,
  "trainingPositiveRate": 0.8636,
  "uncertainty": { "low": 0.577, "high": 0.735, "std": 0.0768, "percentiles": [10, 90] },
  "conformal": { "set": ["Low Risk"], "status": "uncertain", "coverageTarget": 0.8 },
  "outOfDistribution": { "flag": false, "reasons": [], "similarTrainingCases": 14 },
  "lowConfidence": true,
  "modelVersion": "2.1.0",
  "modelFeatures": ["ALLERGY", "COUGHING", "PEER_PRESSURE", "SWALLOWING_DIFFICULTY"],
  "baseValue": 0.8527,
  "explanation": [
    { "feature": "ALLERGY", "label": "Allergy", "value": 0, "shap": -0.1139 },
    { "feature": "SWALLOWING_DIFFICULTY", "label": "Swallowing difficulty", "value": 0, "shap": -0.0868 },
    { "feature": "COUGHING", "label": "Coughing", "value": 1, "shap": 0.0453 },
    { "feature": "PEER_PRESSURE", "label": "Peer pressure", "value": 0, "shap": -0.0369 }
  ]
}
```

This person smokes, is 65 and has several symptoms. The estimate is only just above the threshold, the conformal check disagrees with the label, and the result is marked low confidence. The model uses only allergy, swallowing difficulty, peer pressure and coughing, so smoking, age and chest pain have no effect (see the limitations).

`baseValue` is the model's average output over the training rows. `baseValue` plus the sum of the `shap` values equals `probability` exactly.

## Limitations

- **Small, self-reported dataset.** 276 unique rows, from a public survey with unclear collection methods. It is not a clinical or screening cohort.
- **Class imbalance.** 86% of rows are positive; the training split has only 30 negative examples, so the threshold, calibration and conformal quantile for the Low Risk class rest on few cases.
- **Selected features ignore known risk factors.** Smoking and age were not selected, and predictions depend only on the 4 features listed above. This reflects quirks of this dataset, not medical evidence.
- **Probabilities are calibrated to the dataset, not to reality.** See "Reliability methods".
- **Conformal guarantees are approximate.** They come from cross-validation predictions on 220 rows (cross-conformal), not from a separate calibration set.
- **No external validation.** The model has only been tested on data from the same survey.
- **No authentication.** The service accepts requests from anyone. It is intended to be called by the PulmoDetect backend.

## Reproducing

From the project repository:

```bash
cd ml-service
pip install -r requirements.txt
python scripts/train.py                              # deployed model and all artifacts
PYTHONPATH=. python training/survey/nested_cv.py 10  # nested cross-validation results
```

Use the library versions listed above. The `.joblib` files load reliably only with the same scikit-learn version that saved them.
