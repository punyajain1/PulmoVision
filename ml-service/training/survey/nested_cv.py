import sys, numpy as np
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, GridSearchCV, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.feature_selection import SequentialFeatureSelector
from sklearn.ensemble import BaggingClassifier
from sklearn.tree import DecisionTreeClassifier
from app.utils.data_utils import load_raw_dataset, clean_dataset

REPEATS = int(sys.argv[1]) if len(sys.argv) > 1 else 10
df = clean_dataset(load_raw_dataset("data/lung_cancer.csv"), "LUNG_CANCER")
print("rows after dedup:", len(df), "| positive rate:", round(df["LUNG_CANCER"].mean(), 3))
X, y = df.drop(columns="LUNG_CANCER"), df["LUNG_CANCER"].values
binary = [c for c in X.columns if c not in ("GENDER", "AGE")]

pre = ColumnTransformer([
    ("age", StandardScaler(), ["AGE"]),
    ("bin", "passthrough", binary),
    ("sex", OneHotEncoder(drop="if_binary"), ["GENDER"]),
])
pipe = Pipeline([
    ("pre", pre),
    ("sfs", SequentialFeatureSelector(
        DecisionTreeClassifier(max_depth=4, class_weight="balanced", random_state=42),
        direction="forward", n_features_to_select="auto", tol=0.001,
        scoring="balanced_accuracy", cv=5)),
    ("clf", BaggingClassifier(DecisionTreeClassifier(class_weight="balanced"),
                              n_estimators=100, random_state=42)),
])
search = GridSearchCV(pipe,
    {"clf__max_samples": [0.5, 1.0], "clf__estimator__max_depth": [3, 5, None]},
    cv=StratifiedKFold(5, shuffle=True, random_state=1), scoring="roc_auc")

outer = RepeatedStratifiedKFold(n_splits=5, n_repeats=REPEATS, random_state=42)
res = cross_validate(search, X, y, cv=outer, n_jobs=-1,
    scoring=["roc_auc", "average_precision", "balanced_accuracy", "recall", "neg_brier_score"])
for k, v in res.items():
    if k.startswith("test_"):
        print(f"{k[5:]:20s} {np.mean(v):.3f} ± {np.std(v):.3f}")
