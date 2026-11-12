"""
Sequential Forward Feature Selection.

Starts with an empty feature set and greedily adds the feature that
gives the biggest cross-validated score improvement, stopping when
the improvement is no longer significant or the max feature count is
reached. Cross-validation always runs on the training split only -
the test set is never touched during selection.
"""

import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.base import clone


def forward_feature_selection(
    estimator,
    X_train,
    y_train,
    feature_names,
    max_features=10,
    cv=5,
    min_improvement=0.001,
    scoring="accuracy",
):
    remaining = list(feature_names)
    selected = []
    history = []
    best_score = -np.inf

    while remaining and len(selected) < max_features:
        candidate_scores = {}

        for feature in remaining:
            trial_features = selected + [feature]
            cols_idx = [feature_names.index(f) for f in trial_features]
            X_subset = X_train[:, cols_idx]

            model = clone(estimator)
            scores = cross_val_score(
                model, X_subset, y_train, cv=cv, scoring=scoring
            )
            candidate_scores[feature] = scores.mean()

        best_feature = max(candidate_scores, key=candidate_scores.get)
        best_candidate_score = candidate_scores[best_feature]
        improvement = best_candidate_score - best_score

        history.append(
            {
                "step": len(selected) + 1,
                "feature_added": best_feature,
                "cv_score": round(float(best_candidate_score), 4),
                "improvement": None if np.isinf(improvement) else round(float(improvement), 4),
            }
        )

        if improvement < min_improvement and selected:
            # adding the best available feature barely helps - stop here
            history[-1]["stopped"] = True
            break

        selected.append(best_feature)
        remaining.remove(best_feature)
        best_score = best_candidate_score

    return selected, history
