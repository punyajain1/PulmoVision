"""
Experiments for the PulmoDetect paper. Every number in the paper's results
section comes from the files this script writes to results/paper/.

  E1  Evaluation protocol: raw (with duplicates) vs deduplicated data,
      single 80/20 split (20 seeds) vs repeated stratified 5-fold CV.
  E3  Classifiers (class-weighted LR, RF, Bagging) on all features vs the
      deployed forward-selection features, repeated CV.
  E4  Forward selection with three scoring set-ups (accuracy + unweighted
      tree; balanced accuracy + unweighted tree; balanced accuracy +
      class-weighted depth-4 tree = deployed).
  E6  Selection stability (pairwise Jaccard) and per-feature frequency.
  E7  The deployed reliability layer (calibration, threshold, conformal
      prediction at alpha 0.1 and 0.2, unusual-input check, low-confidence
      flag), fitted inside every training fold and evaluated on the held-out
      fold, for the deployed pipeline and an all-features pipeline.
  E8  Subgroups (sex, age band) for the deployed pipeline.
  E9  Global SHAP importance of the deployed model (v2.1.0 artifacts).

Feature selection, scaling, calibration, threshold and conformal quantiles are
all fitted on the training part of each outer fold only.

Usage (from ml-service/):
    PYTHONPATH=. python training/survey/paper_experiments.py [n_repeats]
"""

import json
import platform
import sys
import time
import warnings
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from joblib import Parallel, delayed
from scipy.stats import fisher_exact
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import BaggingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    roc_auc_score,
)
from sklearn.model_selection import RepeatedStratifiedKFold, train_test_split
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402
from app.services import reliability_service as rs  # noqa: E402
from app.services.forward_elimination_service import forward_feature_selection  # noqa: E402
from app.services.preprocessing_service import (  # noqa: E402
    build_preprocessing_pipeline,
    get_output_feature_names,
)
from app.utils.data_utils import clean_dataset, get_feature_columns, load_raw_dataset  # noqa: E402

SEED = settings.RANDOM_STATE
TARGET = settings.TARGET_COLUMN
N_SPLITS = 5
N_REPEATS = int(sys.argv[1]) if len(sys.argv) > 1 else 10
N_SPLIT_SEEDS = 20
OUT = settings.RESULTS_DIR / "paper"


# ------------------------------------------------------------------ data ---

def load_data(dedup=True):
    raw = load_raw_dataset(settings.DATASET_FULL_PATH)
    if dedup:
        df = clean_dataset(raw, TARGET)
    else:
        # clean_dataset always drops exact duplicates; a temporary row id
        # makes every row unique so the duplicates survive cleaning.
        raw = raw.copy()
        raw["_ROW"] = np.arange(len(raw))
        df = clean_dataset(raw, TARGET).drop(columns="_ROW")
    X = df[get_feature_columns(df, TARGET)].reset_index(drop=True)
    y = df[TARGET].values.astype(int)
    return X, y


def encode(X_tr, X_te):
    pre, num, cat = build_preprocessing_pipeline(X_tr, list(X_tr.columns))
    A = np.asarray(pre.fit_transform(X_tr), dtype=float)
    B = np.asarray(pre.transform(X_te), dtype=float)
    return A, B, get_output_feature_names(pre, num, cat)


# ---------------------------------------------------------------- models ---

def tree(weighted, depth=None):
    return DecisionTreeClassifier(
        max_depth=depth, class_weight="balanced" if weighted else None, random_state=SEED
    )


def bagging(weighted, n=100):
    return BaggingClassifier(estimator=tree(weighted), n_estimators=n, random_state=SEED)


def plain_models():
    """Unweighted models with default settings, as in typical prior work."""
    return {
        "Majority": DummyClassifier(strategy="prior"),
        "LogisticRegression": LogisticRegression(max_iter=1000),
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=SEED),
        "Bagging": bagging(False, 50),
    }


def weighted_models():
    return {
        "LogisticRegression": LogisticRegression(max_iter=1000, class_weight="balanced"),
        "RandomForest": RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=SEED),
        "Bagging": bagging(True),
    }


SFS_CONFIGS = {
    # name: (selector tree, scoring, Bagging weighted?)
    "acc_unweighted": (lambda: tree(False), "accuracy", False),
    "balacc_unweighted": (lambda: tree(False), "balanced_accuracy", False),
    "balacc_weighted_d4": (lambda: tree(True, 4), "balanced_accuracy", True),  # deployed
}


def metrics(y, p, thr=0.5):
    pred = p >= thr
    both = len(np.unique(y)) == 2
    return {
        "roc_auc": roc_auc_score(y, p) if both else np.nan,
        "pr_auc": average_precision_score(y, p) if both else np.nan,
        "accuracy": accuracy_score(y, pred),
        "balanced_accuracy": balanced_accuracy_score(y, pred) if both else np.nan,
        "sensitivity": float(np.mean(pred[y == 1])) if (y == 1).any() else np.nan,
        "specificity": float(np.mean(~pred[y == 0])) if (y == 0).any() else np.nan,
        "brier": rs.brier(y, p),
    }


# ------------------------------------------------------------------- E1 ---

def e1_protocols():
    rows = []
    for dedup in (False, True):
        X, y = load_data(dedup)
        data = "deduplicated" if dedup else "raw (with duplicates)"
        for seed in range(N_SPLIT_SEEDS):
            X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=seed, stratify=y)
            A, B, _ = encode(X_tr, X_te)
            for name, model in plain_models().items():
                model.fit(A, y_tr)
                rows.append({"data": data, "protocol": "single 80/20 split", "model": name, "run": seed,
                             **metrics(y_te, model.predict_proba(B)[:, 1])})
        cv = RepeatedStratifiedKFold(n_splits=N_SPLITS, n_repeats=N_REPEATS, random_state=SEED)
        for k, (tr, te) in enumerate(cv.split(X, y)):
            A, B, _ = encode(X.iloc[tr], X.iloc[te])
            for name, model in plain_models().items():
                model.fit(A, y[tr])
                rows.append({"data": data, "protocol": "repeated 5-fold CV", "model": name, "run": k,
                             **metrics(y[te], model.predict_proba(B)[:, 1])})
    return pd.DataFrame(rows)


def duplicate_facts():
    Xr, yr = load_data(dedup=False)
    Xd, yd = load_data(dedup=True)
    full = Xr.astype(str).agg("|".join, axis=1) + "#" + pd.Series(yr).astype(str)
    feats = Xd.astype(str).agg("|".join, axis=1)
    conflict = pd.DataFrame({"f": feats, "y": yd}).groupby("f")["y"].nunique()

    # share of test rows with an exact copy (features + label) in the training split
    leak = []
    for seed in range(N_SPLIT_SEEDS):
        tr, te = train_test_split(np.arange(len(yr)), test_size=0.2, random_state=seed, stratify=yr)
        train_keys = set(full.iloc[tr])
        leak.append(float(np.mean([full.iloc[i] in train_keys for i in te])))
    return {
        "rows_raw": int(len(yr)),
        "rows_dedup": int(len(yd)),
        "exact_duplicates_removed": int(len(yr) - len(yd)),
        "positive_rate_raw": round(float(yr.mean()), 4),
        "positive_rate_dedup": round(float(yd.mean()), 4),
        "negatives_dedup": int((yd == 0).sum()),
        "conflicting_feature_patterns": int((conflict > 1).sum()),
        "test_rows_with_copy_in_train_mean": round(float(np.mean(leak)), 4),
        "test_rows_with_copy_in_train_range": [round(min(leak), 4), round(max(leak), 4)],
        "age_min": int(Xd["AGE"].min()),
        "age_max": int(Xd["AGE"].max()),
        "female_share": round(float((Xd["GENDER"] == "F").mean()), 4),
    }


# ---------------------------------------------------- E3/E4/E6/E7 folds ---

def _capture_conformal_scores():
    """fit_reliability computes the conformal quantiles from out-of-fold
    nonconformity scores but only stores the alpha=0.2 quantiles. This
    wrapper records the score arrays (positive class first, then negative)
    so quantiles for other alpha levels can be computed from the same fit."""
    captured = []
    original = rs._conformal_quantile

    def recorder(scores, alpha):
        captured.append(np.asarray(scores, dtype=float))
        return original(scores, alpha)

    rs._conformal_quantile = recorder
    return captured, original


def reliability_rows(base, A, y_tr, B, y_te, X_tr, X_te, feature_names, tag, repeat, fold):
    captured, original = _capture_conformal_scores()
    try:
        model, cfg = rs.fit_reliability(base, A, y_tr, X_tr["AGE"].values, feature_names, SEED)
    finally:
        rs._conformal_quantile = original
    s_high, s_low = captured[0], captured[1]

    inner = model.calibrated_classifiers_[0]
    p_raw = inner.estimator.predict_proba(B)[:, 1]
    p_cal = model.predict_proba(B)[:, 1]
    thr = cfg["threshold"]["value"]
    trees = rs.tree_probabilities(model, B)
    lo, hi = cfg["uncertainty"]["interval_percentiles"]
    width = np.percentile(trees, hi, axis=0) - np.percentile(trees, lo, axis=0)

    conf = {}
    for alpha in (0.1, 0.2):
        conf[alpha] = {
            "alpha": alpha,
            "q_high": None if np.isinf(q := rs._conformal_quantile(s_high, alpha)) else q,
            "q_low": None if np.isinf(q2 := rs._conformal_quantile(s_low, alpha)) else q2,
        }

    rows = []
    for i in range(len(y_te)):
        label = "High Risk" if p_cal[i] >= thr else "Low Risk"
        ood = rs.ood_check(int(X_te["AGE"].iloc[i]), B[i], cfg["ood"])["flag"]
        row = {
            "pipeline": tag, "repeat": repeat, "fold": fold, "y": int(y_te[i]),
            "sex": X_te["GENDER"].iloc[i], "age": int(X_te["AGE"].iloc[i]),
            "p_raw": float(p_raw[i]), "p_cal": float(p_cal[i]), "threshold": thr,
            "pred": int(label == "High Risk"), "width": float(width[i]), "ood": bool(ood),
        }
        for alpha, c in conf.items():
            s = rs.conformal_set(p_cal[i], c)
            key = f"a{int(alpha * 100):02d}"
            row[f"set_size_{key}"] = len(s)
            row[f"covered_{key}"] = ("High Risk" if y_te[i] == 1 else "Low Risk") in s
            row[f"confident_{key}"] = (s == [label]) and not ood
        rows.append(row)
    return rows


def run_fold(k, tr, te, X, y):
    warnings.filterwarnings("ignore")
    repeat, fold = divmod(k, N_SPLITS)
    X_tr, X_te = X.iloc[tr], X.iloc[te]
    y_tr, y_te = y[tr], y[te]
    A, B, names = encode(X_tr, X_te)

    sfs_rows, selected = [], {}
    for cfg_name, (make_tree, scoring, weighted) in SFS_CONFIGS.items():
        t = time.perf_counter()
        sel, _ = forward_feature_selection(make_tree(), A, y_tr, names,
                                           max_features=settings.MAX_FORWARD_FEATURES,
                                           cv=settings.CV_FOLDS, scoring=scoring)
        idx = [names.index(f) for f in sel]
        model = bagging(weighted).fit(A[:, idx], y_tr)
        selected[cfg_name] = sel
        sfs_rows.append({"config": cfg_name, "repeat": repeat, "fold": fold, "n_features": len(sel),
                         "features": ";".join(sel), "seconds": time.perf_counter() - t,
                         **metrics(y_te, model.predict_proba(B[:, idx])[:, 1])})

    dep_idx = [names.index(f) for f in selected["balacc_weighted_d4"]]
    clf_rows = []
    for feat_set, idx in (("all features", list(range(len(names)))), ("forward selection", dep_idx)):
        for name, model in weighted_models().items():
            model.fit(A[:, idx], y_tr)
            clf_rows.append({"features": feat_set, "model": name, "repeat": repeat, "fold": fold,
                             "n_features": len(idx), **metrics(y_te, model.predict_proba(B[:, idx])[:, 1])})

    rel = reliability_rows(bagging(True), A[:, dep_idx], y_tr, B[:, dep_idx], y_te, X_tr, X_te,
                           selected["balacc_weighted_d4"], "deployed (forward selection)", repeat, fold)
    rel += reliability_rows(bagging(True), A, y_tr, B, y_te, X_tr, X_te, names,
                            "all features", repeat, fold)
    return sfs_rows, clf_rows, rel


# ----------------------------------------------------------- aggregation ---

def mean_sd(series, digits=3):
    s = pd.Series(series).dropna()
    return {"mean": round(float(s.mean()), digits), "sd": round(float(s.std(ddof=1)), digits) if len(s) > 1 else 0.0}


def jaccard_stability(sets):
    sets = [set(s) for s in sets]
    vals = [len(a & b) / len(a | b) if (a | b) else 1.0 for a, b in combinations(sets, 2)]
    return round(float(np.mean(vals)), 3)


def summarize_reliability(df):
    out = {}
    for tag, g in df.groupby("pipeline"):
        per_rep = []
        for _, r in g.groupby("repeat"):
            y, pr, pc = r["y"].values, r["p_raw"].values, r["p_cal"].values
            pred = r["pred"].values.astype(bool)
            wrong = pred != y.astype(bool)
            rep = {
                "auc": roc_auc_score(y, pc),
                "brier_raw": rs.brier(y, pr), "brier_cal": rs.brier(y, pc),
                "ece_raw": rs.expected_calibration_error(y, pr), "ece_cal": rs.expected_calibration_error(y, pc),
                "sensitivity": float(pred[y == 1].mean()), "specificity": float((~pred[y == 0]).mean()),
                "balanced_accuracy": balanced_accuracy_score(y, pred),
                "error_rate_all": float(wrong.mean()),
                "ood_rate": float(r["ood"].mean()),
                "width_correct": float(r["width"][~wrong].mean()), "width_wrong": float(r["width"][wrong].mean()),
                # Does the tree-spread width rank wrong predictions above correct ones?
                "width_auroc_for_errors": roc_auc_score(wrong, r["width"].values) if 0 < wrong.sum() < len(wrong) else np.nan,
                "err_ood": float(wrong[r["ood"].values].mean()) if r["ood"].any() else np.nan,
                "err_not_ood": float(wrong[~r["ood"].values].mean()),
                "share_errors_false_negative": float((wrong & (y == 1)).sum() / wrong.sum()) if wrong.any() else np.nan,
            }
            # error rate by width tercile (bins from the widths only, no labels)
            ranks = r["width"].rank(method="first").values
            tercile = np.minimum((ranks - 1) * 3 // len(ranks), 2).astype(int)
            for t, name in enumerate(("narrow", "middle", "wide")):
                rep[f"err_width_{name}"] = float(wrong[tercile == t].mean())
            for key in ("a10", "a20"):
                c = r[f"confident_{key}"].values.astype(bool)
                cov = r[f"covered_{key}"].values.astype(bool)
                size = r[f"set_size_{key}"].values
                table = [[int((wrong & ~c).sum()), int((~wrong & ~c).sum())],
                         [int((wrong & c).sum()), int((~wrong & c).sum())]]
                fn_conf = (wrong & c & (y == 1)).sum()
                rep.update({
                    f"{key}_confident_errors_false_negative": float(fn_conf / (wrong & c).sum()) if (wrong & c).any() else np.nan,
                    f"{key}_coverage_high": float(cov[y == 1].mean()),
                    f"{key}_coverage_low": float(cov[y == 0].mean()),
                    f"{key}_single": float((size == 1).mean()), f"{key}_both": float((size == 2).mean()),
                    f"{key}_empty": float((size == 0).mean()),
                    f"{key}_flagged": float((~c).mean()),
                    f"{key}_err_confident": float(wrong[c].mean()) if c.any() else np.nan,
                    f"{key}_err_flagged": float(wrong[~c].mean()) if (~c).any() else np.nan,
                    f"{key}_errors_caught": float((wrong & ~c).sum() / wrong.sum()) if wrong.any() else np.nan,
                    f"{key}_fisher_p": float(fisher_exact(table, alternative="greater")[1]),
                })
            per_rep.append(rep)
        per_rep = pd.DataFrame(per_rep)
        summary = {k: mean_sd(per_rep[k], 4) for k in per_rep.columns if not k.endswith("fisher_p")}
        for key in ("a10", "a20"):
            p = per_rep[f"{key}_fisher_p"]
            summary[f"{key}_fisher_p"] = {"median": float(p.median()), "max": float(p.max())}
        out[tag] = summary
    return out


def summarize_subgroups(df):
    d = df[df["pipeline"] == "deployed (forward selection)"].copy()
    d["age_band"] = pd.cut(d["age"], [0, 59, 69, 200], labels=["<60", "60-69", ">=70"])
    rows = []
    for col in ("sex", "age_band"):
        for level, g in d.groupby(col, observed=True):
            per_rep = []
            for _, r in g.groupby("repeat"):
                y, p, pred = r["y"].values, r["p_cal"].values, r["pred"].values.astype(bool)
                per_rep.append({
                    "auc": roc_auc_score(y, p) if len(np.unique(y)) == 2 else np.nan,
                    "sens": float(pred[y == 1].mean()) if (y == 1).any() else np.nan,
                    "spec": float((~pred[y == 0]).mean()) if (y == 0).any() else np.nan,
                })
            per_rep = pd.DataFrame(per_rep)
            first = g[g["repeat"] == 0]
            rows.append({"group": col, "level": str(level), "n": int(len(first)),
                         "n_negative": int((first["y"] == 0).sum()),
                         **{k: mean_sd(per_rep[k], 3) for k in per_rep.columns}})
    return rows


def global_shap():
    from app.services import prediction_service as ps
    from app.services.explanation_service import exact_shap

    ps._ensure_loaded()
    X, _ = load_data(dedup=True)
    records = X.to_dict(orient="records")
    enc = ps._encode(records)
    phis = np.array([exact_shap(ps._model.predict_proba, x, ps._background)[1] for x in enc])
    names = ps._features["selected_features"]
    rows = []
    for j, name in enumerate(names):
        yes = X[name].values == 1
        rows.append({"feature": name, "mean_abs_shap": round(float(np.abs(phis[:, j]).mean()), 4),
                     "mean_shap_if_yes": round(float(phis[yes, j].mean()), 4) if yes.any() else None,
                     "mean_shap_if_no": round(float(phis[~yes, j].mean()), 4) if (~yes).any() else None})
    return sorted(rows, key=lambda r: -r["mean_abs_shap"])


# --------------------------------------------------------------- figures ---

def figures(rel, sfs, shap_rows, names_all, rel_summary):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.rcParams.update({"font.size": 8, "font.family": "serif", "pdf.fonttype": 42})
    dep = rel[rel["pipeline"] == "deployed (forward selection)"]

    # Fig: reliability diagram (all repeats pooled), quantile bins
    fig, ax = plt.subplots(figsize=(3.4, 2.6))
    for col, label, style in (("p_raw", "Uncalibrated", "o--"), ("p_cal", "Platt-calibrated", "s-")):
        bins = pd.qcut(dep[col], q=8, duplicates="drop")
        g = dep.groupby(bins, observed=True).agg(p=(col, "mean"), y=("y", "mean"))
        ax.plot(g["p"], g["y"], style, ms=3.5, lw=1, label=label, color="black" if col == "p_cal" else "gray")
    ax.plot([0, 1], [0, 1], ":", color="black", lw=0.8)
    ax.set_xlabel("Mean predicted probability")
    ax.set_ylabel("Observed positive rate")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.02)
    ax.legend(frameon=False, loc="lower right")
    fig.tight_layout()
    fig.savefig(OUT / "fig_reliability.pdf")
    plt.close(fig)

    # Fig: error rate by reliability signal (deployed pipeline, mean +- SD over repeats)
    d = rel_summary["deployed (forward selection)"]
    keys = [("a20_err_confident", "Conformal\nconfident"), ("a20_err_flagged", "Conformal\nflagged"),
            ("err_width_narrow", "Spread\nnarrow"), ("err_width_middle", "Spread\nmiddle"),
            ("err_width_wide", "Spread\nwide")]
    fig, ax = plt.subplots(figsize=(3.4, 2.2))
    means = [d[k]["mean"] * 100 for k, _ in keys]
    sds = [d[k]["sd"] * 100 for k, _ in keys]
    colors = ["white", "lightgray", "white", "lightgray", "dimgray"]
    ax.bar(range(len(keys)), means, yerr=sds, color=colors, edgecolor="black", capsize=3, lw=0.8)
    ax.axvline(1.5, color="black", lw=0.5, ls=":")
    ax.set_xticks(range(len(keys)))
    ax.set_xticklabels([n for _, n in keys], fontsize=6.5)
    ax.set_ylabel("Error rate (%)")
    fig.tight_layout()
    fig.savefig(OUT / "fig_flag_errors.pdf")
    plt.close(fig)

    # Fig: selection frequency per feature for two SFS set-ups
    fig, ax = plt.subplots(figsize=(3.4, 2.9))
    n_folds = sfs["fold"].groupby([sfs["config"]]).size().iloc[0]
    freq = {}
    for cfg in ("acc_unweighted", "balacc_weighted_d4"):
        feats = sfs.loc[sfs["config"] == cfg, "features"].str.split(";").explode()
        freq[cfg] = feats[feats != ""].value_counts().reindex(names_all, fill_value=0) / n_folds * 100
    order = (freq["balacc_weighted_d4"] + freq["acc_unweighted"]).sort_values().index
    yy = np.arange(len(order))
    ax.barh(yy + 0.2, freq["balacc_weighted_d4"][order], height=0.4, color="black", label="Bal. acc., weighted (deployed)")
    ax.barh(yy - 0.2, freq["acc_unweighted"][order], height=0.4, color="lightgray", edgecolor="black", lw=0.5, label="Accuracy, unweighted")
    ax.set_yticks(yy)
    ax.set_yticklabels([o.replace("_", " ").title() for o in order], fontsize=6.5)
    ax.set_xlabel("Selected in % of outer folds")
    ax.legend(frameon=False, fontsize=6.5, loc="lower right")
    fig.tight_layout()
    fig.savefig(OUT / "fig_selection_frequency.pdf")
    plt.close(fig)

    # Fig: global SHAP
    fig, ax = plt.subplots(figsize=(3.4, 1.7))
    names = [r["feature"].replace("_", " ").title() for r in shap_rows][::-1]
    vals = [r["mean_abs_shap"] * 100 for r in shap_rows][::-1]
    ax.barh(names, vals, color="gray", edgecolor="black", lw=0.6)
    ax.set_xlabel("Mean |SHAP| (percentage points)")
    fig.tight_layout()
    fig.savefig(OUT / "fig_shap_global.pdf")
    plt.close(fig)


# ------------------------------------------------------------------ main ---

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    warnings.filterwarnings("ignore")
    t0 = time.time()

    print("Dataset facts...")
    facts = duplicate_facts()

    print("E1 evaluation protocols...")
    e1 = e1_protocols()
    e1.to_csv(OUT / "e1_protocols.csv", index=False)

    print(f"E3/E4/E6/E7 repeated {N_SPLITS}-fold CV x {N_REPEATS} repeats...")
    X, y = load_data(dedup=True)
    cv = RepeatedStratifiedKFold(n_splits=N_SPLITS, n_repeats=N_REPEATS, random_state=SEED)
    results = Parallel(n_jobs=-1)(delayed(run_fold)(k, tr, te, X, y) for k, (tr, te) in enumerate(cv.split(X, y)))
    sfs = pd.DataFrame([r for res in results for r in res[0]])
    clf = pd.DataFrame([r for res in results for r in res[1]])
    rel = pd.DataFrame([r for res in results for r in res[2]])
    sfs.to_csv(OUT / "e4_e6_forward_selection.csv", index=False)
    clf.to_csv(OUT / "e3_classifiers.csv", index=False)
    rel.to_csv(OUT / "e7_reliability_predictions.csv", index=False)

    print("E9 global SHAP...")
    shap_rows = global_shap()

    names_all = encode(X, X)[2]
    rel_summary = summarize_reliability(rel)
    figures(rel, sfs, shap_rows, names_all, rel_summary)

    metric_cols = ["roc_auc", "pr_auc", "accuracy", "balanced_accuracy", "sensitivity", "specificity", "brier"]
    summary = {
        "run_info": {
            "n_repeats": N_REPEATS, "n_splits": N_SPLITS, "n_split_seeds": N_SPLIT_SEEDS, "seed": SEED,
            "python": platform.python_version(), "scikit-learn": sklearn.__version__,
            "numpy": np.__version__, "pandas": pd.__version__, "machine": platform.machine(),
            "seconds": round(time.time() - t0, 1),
        },
        "dataset": facts,
        "e1_protocols": [
            {"data": d, "protocol": p, "model": m,
             **{c: mean_sd(g[c]) for c in ("roc_auc", "accuracy", "balanced_accuracy", "specificity")},
             "best_run_accuracy": round(float(g["accuracy"].max()), 3)}
            for (d, p, m), g in e1.groupby(["data", "protocol", "model"], sort=False)
        ],
        "e3_classifiers": [
            {"features": f, "model": m, "n_features": mean_sd(g["n_features"], 1),
             **{c: mean_sd(g[c]) for c in metric_cols}}
            for (f, m), g in clf.groupby(["features", "model"], sort=False)
        ],
        "e4_forward_selection": [
            {"config": c, "n_features": mean_sd(g["n_features"], 2),
             "share_single_feature": round(float((g["n_features"] == 1).mean()), 3),
             "jaccard_stability": jaccard_stability(g["features"].str.split(";")),
             "most_common_first_feature": g["features"].str.split(";").str[0].value_counts().index[0],
             "seconds_per_run": mean_sd(g["seconds"], 2),
             **{k: mean_sd(g[k]) for k in ("roc_auc", "balanced_accuracy")}}
            for c, g in sfs.groupby("config", sort=False)
        ],
        "e6_selection_frequency": {
            c: (g["features"].str.split(";").explode().value_counts() / len(g)).round(3).to_dict()
            for c, g in sfs.groupby("config", sort=False)
        },
        "e7_reliability": rel_summary,
        "e8_subgroups": summarize_subgroups(rel),
        "e9_global_shap": shap_rows,
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, default=float))
    print(f"Done in {summary['run_info']['seconds']} s. Results in {OUT}")


if __name__ == "__main__":
    main()
