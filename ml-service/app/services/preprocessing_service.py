"""
Builds the sklearn preprocessing pipeline (scaling numeric columns,
one-hot encoding categorical columns) shared between training and
inference so the exact same transform is applied both times.
"""

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder


def build_preprocessing_pipeline(df, feature_columns):
    numeric_cols = [
        c for c in feature_columns if df[c].dtype in ("int64", "float64")
    ]
    categorical_cols = [c for c in feature_columns if c not in numeric_cols]

    transformers = []
    if numeric_cols:
        transformers.append(("num", StandardScaler(), numeric_cols))
    if categorical_cols:
        transformers.append(
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols)
        )

    preprocessor = ColumnTransformer(transformers=transformers)
    return preprocessor, numeric_cols, categorical_cols


def get_output_feature_names(preprocessor, numeric_cols, categorical_cols):
    names = list(numeric_cols)
    if categorical_cols:
        cat_encoder = preprocessor.named_transformers_["cat"]
        names += list(cat_encoder.get_feature_names_out(categorical_cols))
    return names
