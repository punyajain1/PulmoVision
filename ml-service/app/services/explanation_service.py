"""
Exact SHAP (Shapley) values for one prediction.

The model sees only the k selected features. For every subset S of those
features we take the person's values for S and each background (training) row's
values for the rest, and average the model's probability over the background:

    v(S) = mean_b  f(x_S, b_rest)

The Shapley value of feature i is the weighted average of v(S + i) - v(S) over
all subsets S without i. This is the "interventional" SHAP definition used by
shap.KernelExplainer / PermutationExplainer, computed exactly instead of by
sampling. It needs 2^k * n model evaluations, done in one batch, which is fast
for the small k produced by forward selection (k = 4 -> 16 subsets).

Properties used by the app:
    base_value + sum(shap values) == predicted probability   (exactly)
    a feature the model doesn't use always gets 0
"""

from itertools import combinations
from math import factorial

import numpy as np

MAX_EXACT_FEATURES = 12  # 2^12 subsets; beyond this, use sampling instead


def _subset_values(predict_proba, x, background):
    """v(S) for every subset S, indexed by bitmask."""
    k = x.shape[0]
    n = background.shape[0]
    masks = np.arange(2 ** k)
    # bits[m, j] is True when feature j is taken from x in subset m
    bits = ((masks[:, None] >> np.arange(k)) & 1).astype(bool)

    batch = np.repeat(background[None, :, :], len(masks), axis=0)  # (2^k, n, k)
    batch = np.where(bits[:, None, :], x[None, None, :], batch)
    proba = predict_proba(batch.reshape(-1, k))[:, 1].reshape(len(masks), n)
    return proba.mean(axis=1)


def exact_shap(predict_proba, x, background):
    """Returns (base_value, shap_values) for a single row x of shape (k,)."""
    x = np.asarray(x, dtype=float)
    k = x.shape[0]
    if k > MAX_EXACT_FEATURES:
        raise ValueError(f"Exact SHAP supports at most {MAX_EXACT_FEATURES} features, got {k}")

    v = _subset_values(predict_proba, x, np.asarray(background, dtype=float))
    weights = [factorial(s) * factorial(k - s - 1) / factorial(k) for s in range(k)]

    phi = np.zeros(k)
    for i in range(k):
        others = [j for j in range(k) if j != i]
        for size in range(k):
            for subset in combinations(others, size):
                mask = sum(1 << j for j in subset)
                phi[i] += weights[size] * (v[mask | (1 << i)] - v[mask])

    return float(v[0]), phi
