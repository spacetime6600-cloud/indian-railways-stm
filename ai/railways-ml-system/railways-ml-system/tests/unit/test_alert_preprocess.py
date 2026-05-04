"""Unit tests for src/alert_prioritization/preprocess.py."""

import numpy as np
import pandas as pd
import pytest

from src.alert_prioritization.preprocess import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    fit_preprocessor,
    transform,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

KNOWN_ALERT_TYPES = ["Critical", "High", "Medium", "Low"]


def _make_df(n=20, alert_types=None):
    """Return a small synthetic DataFrame with all required columns."""
    rng = np.random.default_rng(0)
    if alert_types is None:
        alert_types = [KNOWN_ALERT_TYPES[i % len(KNOWN_ALERT_TYPES)] for i in range(n)]
    return pd.DataFrame(
        {
            "alert_type": alert_types,
            "delay_impact": rng.uniform(0, 10, n),
            "safety_risk": rng.uniform(0, 10, n),
            "affected_trains": rng.integers(1, 20, n).astype(float),
            "route_busy": rng.uniform(0, 1, n),
            "peak_hour": rng.integers(0, 2, n).astype(float),
            "priority": rng.integers(0, 4, n),
        }
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_categorical_encoding_known_values():
    """Known alert_type values should be encoded to non-negative integers."""
    df = _make_df()
    pipeline, transformed_df = fit_preprocessor(df, {})

    # The categorical column should contain numeric codes, not the original strings
    cat_col = transformed_df["alert_type"]
    assert cat_col.dtype in (np.float64, np.int64, float, int) or np.issubdtype(
        cat_col.dtype, np.number
    ), "alert_type column should be numeric after encoding"

    # Each unique string maps to a distinct integer
    unique_encoded = cat_col.unique()
    assert len(unique_encoded) == len(set(KNOWN_ALERT_TYPES))


def test_numeric_scaling_mean_and_std():
    """After StandardScaler the numeric features should have mean ≈ 0 and std ≈ 1."""
    n = 200
    df = _make_df(n=n)
    _, transformed_df = fit_preprocessor(df, {})

    for col in NUMERIC_FEATURES:
        col_vals = transformed_df[col].values
        assert abs(col_vals.mean()) < 0.1, f"{col} mean should be ~0, got {col_vals.mean():.4f}"
        assert abs(col_vals.std() - 1.0) < 0.1, f"{col} std should be ~1, got {col_vals.std():.4f}"


def test_transform_missing_field_raises_value_error():
    """transform() must raise ValueError with 'Missing required field: <field>' for absent columns."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    for missing_field in ALL_FEATURES:
        incomplete_df = df[ALL_FEATURES].drop(columns=[missing_field])
        with pytest.raises(ValueError, match=f"Missing required field: {missing_field}"):
            transform(pipeline, incomplete_df)


def test_transform_unknown_categorical_raises_value_error():
    """transform() must raise ValueError containing 'Unexpected value' for unknown alert_type."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    bad_df = _make_df(n=5)
    bad_df["alert_type"] = "UNKNOWN_TYPE"

    with pytest.raises(ValueError, match="Unexpected value"):
        transform(pipeline, bad_df)


def test_transform_output_shape():
    """transform() output should have the same number of rows and all feature columns."""
    df = _make_df(n=30)
    pipeline, _ = fit_preprocessor(df, {})

    test_df = _make_df(n=10)
    result = transform(pipeline, test_df[ALL_FEATURES])

    assert result.shape == (10, len(ALL_FEATURES))
    assert list(result.columns) == ALL_FEATURES
