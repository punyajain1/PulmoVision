"""
Calibration, decision threshold, uncertainty, conformal prediction and the
unusual-input check. Training code (scripts/train.py) calls `fit_reliability`
once; the API calls `assess` for every prediction.

All statistics are fitted on the TRAINING split only, using out-of-fold (OOF)
predictions from 5-fold cross-validation, so the held-out test set stays
untouched for evaluation.

1. Calibration (Platt / sigmoid scaling)
   The trees use class_weight="balanced", which pushes probabilities away from
   the true class rates. A sigmoid fitted on OOF scores maps them back.
   Implemented with CalibratedClassifierCV(ensemble=False): the calibrator is
   fitted on OOF predictions and the final Bagging model is refitted on the
   whole training split. The probabilities are calibrated to THIS dataset,
   where about 86% of participants had lung cancer - not to any real
   population.

2. Threshold
   The highest threshold whose OOF sensitivity is still >= 90% (missing a
   positive case is treated as worse than a false alarm).

3. Uncertainty
   The Bagging model averages 100 bootstrap trees. Each tree's probability,
   passed through the same calibrator, gives a distribution; we report its
   10th-90th percentile range and standard deviation. A wide range means the
   bootstrap samples disagree about this kind of answer pattern.

4. Conformal prediction (class-conditional / Mondrian, alpha = 0.20)
   For each class c, q_c is a quantile of OOF nonconformity scores
   1 - p(c | x) over training rows of class c. The prediction set contains
   every class whose score is <= q_c. In repeated use about 80% of people of
   each true class get a set containing their true class (cross-conformal:
   approximately, not exactly, valid). Status shown to the user:
     set == {threshold label}            -> confident
     both labels, or the other label     -> uncertain, not a clear call
     {}                                  -> answer pattern unlike the training data

5. Unusual-input check
   Flags ages outside the 1st-99th percentile of training ages, and answer
   combinations (on the features the model uses) seen fewer than
   MIN_SUPPORT times in the training split.
"""

import math

import numpy as np
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedKFold, cross_val_predict

HIGH, LOW = "High Risk", "Low Risk"
TARGET_SENSITIVITY = 0.90
# 80% per-class coverage. At 90% the model returned both labels for 52 of 56
# test cases (its 4 yes/no inputs can't separate many negatives from
# positives), which makes the output uninformative. Report both in the paper.
CONFORMAL_ALPHA = 0.20
MIN_SUPPORT = 5
INTERVAL_PERCENTILES = (10, 90)


# ---------------------------------------------------------------- training ---

def _conformal_quantile(scores, alpha):
    n = len(scores)
    k = math.ceil((n + 1) * (1 - alpha))
    if n == 0 or k > n:
        return math.inf  # too few examples: never exclude this class
    return float(np.sort(scores)[k - 1])


def _threshold_for_sensitivity(proba, y, target):
    best = float(np.min(proba))
    for t in np.unique(proba):
        if np.mean(proba[y == 1] >= t) >= target:
            best = max(best, float(t))
    pred = proba >= best
    return best, float(np.mean(pred[y == 1])), float(np.mean(~pred[y == 0]))


def _row_key(row):
    return ",".join(f"{v:.4f}" for v in row)


def brier(y, p):
    return float(np.mean((np.asarray(p) - np.asarray(y)) ** 2))


def expected_calibration_error(y, p, bins=10):
    y, p = np.asarray(y), np.asarray(p)
    edges = np.linspace(0, 1, bins + 1)
    ece = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        mask = (p > lo) & (p <= hi) if lo > 0 else (p >= lo) & (p <= hi)
        if mask.any():
            ece += mask.mean() * abs(p[mask].mean() - y[mask].mean())
    return float(ece)


def fit_reliability(base_estimator, X_train, y_train, train_ages, feature_names, random_state):
    """Returns (calibrated_model, config_dict)."""
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)

    calibrated = CalibratedClassifierCV(base_estimator, method="sigmoid", cv=folds, ensemble=False)
    calibrated.fit(X_train, y_train)
    calibrator = calibrated.calibrated_classifiers_[0].calibrators[0]

    # Same folds as the calibrator used internally.
    oof_raw = cross_val_predict(clone(base_estimator), X_train, y_train, cv=folds, method="predict_proba")[:, 1]
    oof_cal = calibrator.predict(oof_raw)

    threshold, oof_sens, oof_spec = _threshold_for_sensitivity(oof_cal, y_train, TARGET_SENSITIVITY)

    q_high = _conformal_quantile(1 - oof_cal[y_train == 1], CONFORMAL_ALPHA)
    q_low = _conformal_quantile(oof_cal[y_train == 0], CONFORMAL_ALPHA)

    # Answer-pattern support only makes sense when every used feature is discrete.
    discrete = all(len(np.unique(X_train[:, j])) <= 2 for j in range(X_train.shape[1]))
    combo_counts = None
    if discrete:
        keys, counts = np.unique([_row_key(r) for r in X_train], return_counts=True)
        combo_counts = {k: int(c) for k, c in zip(keys, counts)}

    config = {
        "calibration": {
            "method": "sigmoid (Platt), fitted on 5-fold out-of-fold predictions of the training split",
            "oof_brier_uncalibrated": round(brier(y_train, oof_raw), 4),
            "oof_brier_calibrated": round(brier(y_train, oof_cal), 4),
            "oof_ece_uncalibrated": round(expected_calibration_error(y_train, oof_raw), 4),
            "oof_ece_calibrated": round(expected_calibration_error(y_train, oof_cal), 4),
            "training_positive_rate": round(float(np.mean(y_train)), 4),
        },
        "threshold": {
            "value": round(threshold, 4),
            "rule": f"highest threshold with out-of-fold sensitivity >= {TARGET_SENSITIVITY:.0%}",
            "oof_sensitivity": round(oof_sens, 4),
            "oof_specificity": round(oof_spec, 4),
        },
        "conformal": {
            "alpha": CONFORMAL_ALPHA,
            "type": "class-conditional (Mondrian) cross-conformal on out-of-fold predictions",
            "q_high": None if math.isinf(q_high) else round(q_high, 6),
            "q_low": None if math.isinf(q_low) else round(q_low, 6),
            "n_high": int(np.sum(y_train == 1)),
            "n_low": int(np.sum(y_train == 0)),
        },
        "uncertainty": {
            "method": "spread of the 100 bootstrap trees' calibrated probabilities",
            "interval_percentiles": list(INTERVAL_PERCENTILES),
        },
        "ood": {
            "age_low": float(np.percentile(train_ages, 1)),
            "age_high": float(np.percentile(train_ages, 99)),
            "min_support": MIN_SUPPORT,
            "feature_names": list(feature_names),
            "combo_counts": combo_counts,
        },
    }
    return calibrated, config


# --------------------------------------------------------------- inference ---

def _parts(calibrated_model):
    inner = calibrated_model.calibrated_classifiers_[0]
    return inner.estimator, inner.calibrators[0]


def tree_probabilities(calibrated_model, X):
    """Calibrated probability from each bootstrap tree, shape (n_trees, n_rows)."""
    bagging, calibrator = _parts(calibrated_model)
    positive = list(bagging.classes_).index(1)
    rows = []
    for tree, cols in zip(bagging.estimators_, bagging.estimators_features_):
        proba = tree.predict_proba(X[:, cols])
        # A bootstrap sample can miss a class; map the tree's columns back.
        p = np.zeros(X.shape[0])
        tree_classes = list(tree.classes_)
        if positive in tree_classes:
            p = proba[:, tree_classes.index(positive)]
        rows.append(p)
    raw = np.vstack(rows)
    return calibrator.predict(raw.ravel()).reshape(raw.shape)


def conformal_set(probability, conformal):
    labels = []
    q_high, q_low = conformal.get("q_high"), conformal.get("q_low")
    if q_high is None or (1 - probability) <= q_high:
        labels.append(HIGH)
    if q_low is None or probability <= q_low:
        labels.append(LOW)
    return labels


def ood_check(age, x_selected, ood):
    reasons = []
    if age is not None and (age < ood["age_low"] or age > ood["age_high"]):
        reasons.append(
            f"Age {age} is outside the range covering 98% of training participants "
            f"({ood['age_low']:.0f}-{ood['age_high']:.0f})."
        )
    support = None
    if ood.get("combo_counts") is not None:
        support = ood["combo_counts"].get(_row_key(x_selected), 0)
        if support < ood["min_support"]:
            reasons.append(
                f"Only {support} training participant(s) gave this combination of the answers the model uses."
            )
    return {"flag": bool(reasons), "reasons": reasons, "similarTrainingCases": support}


def assess(calibrated_model, config, x_selected, probability, age):
    """Threshold label, uncertainty interval, conformal set and unusual-input flags."""
    threshold = config["threshold"]["value"]
    label = HIGH if probability >= threshold else LOW

    trees = tree_probabilities(calibrated_model, x_selected.reshape(1, -1))[:, 0]
    lo_pct, hi_pct = config["uncertainty"]["interval_percentiles"]
    uncertainty = {
        "low": round(float(np.percentile(trees, lo_pct)), 4),
        "high": round(float(np.percentile(trees, hi_pct)), 4),
        "std": round(float(np.std(trees)), 4),
        "percentiles": [lo_pct, hi_pct],
    }

    conformal = config["conformal"]
    pred_set = conformal_set(probability, conformal)
    if not pred_set:
        status = "atypical"
    elif pred_set == [label]:
        status = "confident"
    else:
        # Both labels, or a single label that disagrees with the threshold
        # label (probabilities just above the threshold): not a clear call.
        status = "uncertain"

    ood = ood_check(age, x_selected, config["ood"])

    return {
        "prediction": label,
        "threshold": threshold,
        # Share of training participants with lung cancer; the probability is
        # calibrated to this rate, not to any real population.
        "trainingPositiveRate": config["calibration"]["training_positive_rate"],
        "uncertainty": uncertainty,
        "conformal": {
            "set": pred_set,
            "status": status,
            "coverageTarget": round(1 - conformal["alpha"], 2),
        },
        "outOfDistribution": ood,
        "lowConfidence": status != "confident" or ood["flag"],
    }
