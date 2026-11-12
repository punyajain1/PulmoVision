"""
End-to-end training pipeline:
  1. load + clean data
  2. EDA (saved as images in results/)
  3. train/test split
  4. preprocessing pipeline
  5. baseline model comparison (with vs without forward elimination)
  6. forward elimination feature selection (train set + CV only)
  7. bagging classifier as the primary model
  8. evaluation on the held-out test set
  9. save artifacts (model, preprocessing, selected features, metadata)

Run from the ml-service/ directory:
    python scripts/train.py
"""

import json
import sys
import time
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import sklearn

sys.path.append(str(Path(__file__).resolve().parent.parent))

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, BaggingClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve,
)

from app.config import settings
from app.utils.data_utils import load_raw_dataset, clean_dataset, get_feature_columns
from app.services.preprocessing_service import build_preprocessing_pipeline
from app.services.forward_elimination_service import forward_feature_selection
from app.services.reliability_service import (
    brier,
    conformal_set,
    expected_calibration_error,
    fit_reliability,
    ood_check,
    tree_probabilities,
)


def load_and_prepare_data():
    if not settings.DATASET_FULL_PATH.exists():
        print(f"No dataset found at {settings.DATASET_FULL_PATH}.")
        print("Generating a synthetic placeholder dataset instead...")
        from scripts.generate_synthetic_data import generate

        settings.DATASET_FULL_PATH.parent.mkdir(parents=True, exist_ok=True)
        generate().to_csv(settings.DATASET_FULL_PATH, index=False)

    df = load_raw_dataset(settings.DATASET_FULL_PATH)
    df = clean_dataset(df, settings.TARGET_COLUMN)
    return df


def run_eda(df, results_dir):
    results_dir.mkdir(parents=True, exist_ok=True)

    # class distribution
    plt.figure(figsize=(5, 4))
    sns.countplot(x=settings.TARGET_COLUMN, data=df)
    plt.title("Class Distribution")
    plt.savefig(results_dir / "eda_class_distribution.png", bbox_inches="tight")
    plt.close()

    # age distribution
    if "AGE" in df.columns:
        plt.figure(figsize=(5, 4))
        sns.histplot(df["AGE"], kde=True)
        plt.title("Age Distribution")
        plt.savefig(results_dir / "eda_age_distribution.png", bbox_inches="tight")
        plt.close()

    # correlation heatmap (numeric-ish columns only)
    numeric_df = df.copy()
    for col in numeric_df.columns:
        if numeric_df[col].dtype == object:
            numeric_df[col] = numeric_df[col].astype("category").cat.codes

    plt.figure(figsize=(10, 8))
    sns.heatmap(numeric_df.corr(), cmap="coolwarm", center=0)
    plt.title("Feature Correlation")
    plt.savefig(results_dir / "eda_correlation_heatmap.png", bbox_inches="tight")
    plt.close()

    # missing values (post-clean, should be near zero, kept for the report)
    missing = df.isna().sum()
    missing = missing[missing > 0]
    print(f"Missing values after cleaning:\n{missing if len(missing) else 'none'}")


def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else None

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
    }
    if y_proba is not None:
        metrics["roc_auc"] = round(roc_auc_score(y_test, y_proba), 4)

    return metrics, y_pred, y_proba


def evaluate_deployed(model, reliability, X_test, y_test, test_ages):
    """Metrics for the deployed model at its chosen threshold, plus conformal
    coverage, uncertainty and unusual-input rates on the held-out test set."""
    y_proba = model.predict_proba(X_test)[:, 1]
    threshold = reliability["threshold"]["value"]
    y_pred = (y_proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()

    metrics = {
        "threshold": threshold,
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "specificity": round(tn / (tn + fp), 4) if (tn + fp) else None,
        "balanced_accuracy": round(balanced_accuracy_score(y_test, y_pred), 4),
        "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_proba)), 4),
        "pr_auc": round(float(average_precision_score(y_test, y_proba)), 4),
        "brier": round(brier(y_test, y_proba), 4),
        "ece": round(expected_calibration_error(y_test, y_proba), 4),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }

    sets = [conformal_set(p, reliability["conformal"]) for p in y_proba]
    labels = np.where(y_test == 1, "High Risk", "Low Risk")
    covered = np.array([lab in s for lab, s in zip(labels, sets)])
    sizes = np.array([len(s) for s in sets])
    trees = tree_probabilities(model, X_test)
    lo, hi = reliability["uncertainty"]["interval_percentiles"]
    width = np.percentile(trees, hi, axis=0) - np.percentile(trees, lo, axis=0)
    wrong = y_pred != y_test
    ood = np.array([ood_check(a, x, reliability["ood"])["flag"] for a, x in zip(test_ages, X_test)])
    pred_labels = np.where(y_pred == 1, "High Risk", "Low Risk")
    # same rule as the API: confident = conformal set is exactly the label, and input not unusual
    confident = np.array([s == [lab] for s, lab in zip(sets, pred_labels)]) & ~ood

    test_reliability = {
        "conformal_coverage_high": round(float(covered[y_test == 1].mean()), 4),
        "conformal_coverage_low": round(float(covered[y_test == 0].mean()), 4) if (y_test == 0).any() else None,
            "conformal_singletons": int((sizes == 1).sum()),
        "confident_predictions": int(confident.sum()),
        # Do the low-confidence flags pick out the model's mistakes?
        "error_rate_confident": round(float(wrong[confident].mean()), 4) if confident.any() else None,
        "error_rate_flagged": round(float(wrong[~confident].mean()), 4) if (~confident).any() else None,
        "conformal_both": int((sizes == 2).sum()),
        "conformal_empty": int((sizes == 0).sum()),
        "mean_interval_width_correct": round(float(width[~wrong].mean()), 4) if (~wrong).any() else None,
        "mean_interval_width_wrong": round(float(width[wrong].mean()), 4) if wrong.any() else None,
        "unusual_input_rate": round(float(np.mean(ood)), 4),
        "n_test": int(len(y_test)),
    }
    return metrics, y_pred, y_proba, test_reliability


def compare_baseline_models(X_train, y_train, X_test, y_test):
    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=settings.RANDOM_STATE),
        "DecisionTree": DecisionTreeClassifier(random_state=settings.RANDOM_STATE),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=settings.RANDOM_STATE),
        "SVM": SVC(probability=True, random_state=settings.RANDOM_STATE),
        "Bagging": BaggingClassifier(
            estimator=DecisionTreeClassifier(random_state=settings.RANDOM_STATE),
            n_estimators=50,
            random_state=settings.RANDOM_STATE,
        ),
    }

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        metrics, _, _ = evaluate_model(model, X_test, y_test)
        results[name] = metrics

    return results


def main():
    start = time.time()
    ml_service_dir = Path(__file__).resolve().parent.parent

    print("Step 1/8: Loading and cleaning data...")
    df = load_and_prepare_data()
    print(f"Dataset shape after cleaning: {df.shape}")

    print("Step 2/8: Running EDA...")
    run_eda(df, settings.RESULTS_DIR)

    feature_columns = get_feature_columns(df, settings.TARGET_COLUMN)
    X_raw = df[feature_columns]
    y = df[settings.TARGET_COLUMN].values

    print("Step 3/8: Splitting train/test...")
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X_raw, y, test_size=settings.TEST_SIZE, random_state=settings.RANDOM_STATE, stratify=y
    )

    print("Step 4/8: Building preprocessing pipeline...")
    preprocessor, numeric_cols, categorical_cols = build_preprocessing_pipeline(
        X_raw, feature_columns
    )
    X_train = preprocessor.fit_transform(X_train_raw)
    X_test = preprocessor.transform(X_test_raw)
    if hasattr(X_train, "toarray"):
        X_train = X_train.toarray()
        X_test = X_test.toarray()

    from app.services.preprocessing_service import get_output_feature_names
    all_feature_names = get_output_feature_names(preprocessor, numeric_cols, categorical_cols)

    print("Step 5/8: Comparing baseline models WITHOUT forward elimination...")
    results_without_fe = compare_baseline_models(X_train, y_train, X_test, y_test)

    print("Step 6/8: Running forward feature elimination (train set + CV only)...")
    # class_weight="balanced": with ~86% positives an unweighted tree predicts
    # "positive" for every row, so every feature scores 0.5 balanced accuracy
    # and selection stops after one arbitrary feature.
    fe_estimator = DecisionTreeClassifier(
        max_depth=4, class_weight="balanced", random_state=settings.RANDOM_STATE
    )
    selected_features, fe_history = forward_feature_selection(
        fe_estimator,
        X_train,
        y_train,
        all_feature_names,
        max_features=min(settings.MAX_FORWARD_FEATURES, len(all_feature_names)),
        cv=settings.CV_FOLDS,
        scoring="balanced_accuracy",
    )
    print(f"Selected {len(selected_features)} features: {selected_features}")

    selected_idx = [all_feature_names.index(f) for f in selected_features]
    X_train_fe = X_train[:, selected_idx]
    X_test_fe = X_test[:, selected_idx]

    print("Step 7/8: Comparing baseline models WITH forward elimination...")
    results_with_fe = compare_baseline_models(X_train_fe, y_train, X_test_fe, y_test)

    print("Training primary Bagging model on selected features...")
    bagging_model = BaggingClassifier(
        estimator=DecisionTreeClassifier(
            class_weight="balanced", random_state=settings.RANDOM_STATE
        ),
        n_estimators=100,
        random_state=settings.RANDOM_STATE,
    )
    bagging_model.fit(X_train_fe, y_train)
    uncalibrated_metrics, _, uncalibrated_proba = evaluate_model(bagging_model, X_test_fe, y_test)
    print(f"Bagging model (uncalibrated, threshold 0.5): {uncalibrated_metrics}")

    print("Calibrating, choosing the threshold and fitting conformal / unusual-input statistics (training split only)...")
    deployed_model, reliability = fit_reliability(
        bagging_model,
        X_train_fe,
        y_train,
        X_train_raw["AGE"].values,
        selected_features,
        settings.RANDOM_STATE,
    )
    final_metrics, y_pred, y_proba, test_reliability = evaluate_deployed(
        deployed_model, reliability, X_test_fe, y_test, X_test_raw["AGE"].values
    )
    final_metrics["brier_uncalibrated"] = round(
        float(np.mean((uncalibrated_proba - y_test) ** 2)), 4
    )
    print(f"Deployed model (calibrated, threshold {reliability['threshold']['value']}): {final_metrics}")
    print(f"Test-set reliability: {test_reliability}")

    print("Step 8/8: Saving artifacts and evaluation plots...")

    # confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")
    plt.title("Confusion Matrix - Bagging Classifier")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.savefig(settings.RESULTS_DIR / "confusion_matrix.png", bbox_inches="tight")
    plt.close()

    # ROC curve
    if y_proba is not None:
        fpr, tpr, _ = roc_curve(y_test, y_proba)
        plt.figure(figsize=(5, 4))
        plt.plot(fpr, tpr, label=f"ROC-AUC = {final_metrics.get('roc_auc', 0):.3f}")
        plt.plot([0, 1], [0, 1], linestyle="--", color="gray")
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.title("ROC Curve - Bagging Classifier")
        plt.legend()
        plt.savefig(settings.RESULTS_DIR / "roc_curve.png", bbox_inches="tight")
        plt.close()

    # model comparison chart
    comparison_df = pd.DataFrame(results_with_fe).T
    comparison_df.plot(kind="bar", figsize=(9, 5))
    plt.title("Model Comparison (With Forward Elimination)")
    plt.ylabel("Score")
    plt.xticks(rotation=20)
    plt.tight_layout()
    plt.savefig(settings.RESULTS_DIR / "model_comparison.png", bbox_inches="tight")
    plt.close()

    # save raw comparison + feature selection results as JSON for the report
    with open(settings.RESULTS_DIR / "model_comparison.json", "w") as f:
        json.dump(
            {"without_forward_elimination": results_without_fe, "with_forward_elimination": results_with_fe},
            f,
            indent=2,
        )
    with open(settings.RESULTS_DIR / "forward_elimination_history.json", "w") as f:
        json.dump(fe_history, f, indent=2)

    # save model artifacts
    settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    # the deployed model is the calibrated wrapper around the Bagging model
    joblib.dump(deployed_model, settings.MODEL_FILE)
    joblib.dump(preprocessor, settings.PREPROCESSING_FILE)
    with open(settings.RELIABILITY_FILE, "w") as f:
        json.dump(reliability, f, indent=2)
    # training rows (selected features) used as the SHAP reference distribution
    np.save(settings.SHAP_BACKGROUND_FILE, X_train_fe.astype(np.float64))

    with open(settings.FEATURES_FILE, "w") as f:
        json.dump(
            {
                "raw_feature_columns": feature_columns,
                "encoded_feature_names": all_feature_names,
                "selected_features": selected_features,
            },
            f,
            indent=2,
        )

    metadata = {
        "model_name": "BaggingClassifier",
        "model_id": settings.MODEL_ID,
        "model_version": settings.MODEL_VERSION,
        "base_estimator": "DecisionTreeClassifier",
        "trained_at": pd.Timestamp.utcnow().isoformat(),
        "n_features_selected": len(selected_features),
        "n_features_total": len(all_feature_names),
        "calibrated": True,
        "threshold": reliability["threshold"]["value"],
        "test_metrics": final_metrics,
        "test_metrics_uncalibrated_threshold_0_5": uncalibrated_metrics,
        "test_reliability": test_reliability,
        "calibration": reliability["calibration"],
        "training_rows": int(X_train.shape[0]),
        "test_rows": int(X_test.shape[0]),
        "training_positive_rate": reliability["calibration"]["training_positive_rate"],
        "dataset_file": settings.DATASET_FULL_PATH.name,
        "random_state": settings.RANDOM_STATE,
        "library_versions": {
            "python": sys.version.split()[0],
            "scikit-learn": sklearn.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "joblib": joblib.__version__,
        },
        "training_duration_seconds": round(time.time() - start, 2),
    }
    with open(settings.METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Done in {metadata['training_duration_seconds']}s. Artifacts saved to {settings.MODEL_DIR}")


if __name__ == "__main__":
    main()
