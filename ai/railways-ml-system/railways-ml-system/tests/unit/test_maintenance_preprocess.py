"""Unit tests for src/predictive_maintenance/preprocess.py."""

import numpy as np
import pandas as pd
import pytest

from src.predictive_maintenance.preprocess import (
    FEATURE_RANGES,
    NUMERIC_FEATURES,
    fit_preprocessor,
    transform,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_df(n=50, seed=0):
    """Return a small synthetic DataFrame with all required maintenance columns."""
    rng = np.random.default_rng(seed)
    return pd.DataFrame(
        {
            "temperature": rng.uniform(20, 100, n),
            "vibration": rng.uniform(0, 20, n),
            "usage_hours": rng.uniform(100, 50000, n),
            "last_service_days": rng.uniform(0, 500, n),
            "fault_history": rng.uniform(0, 50, n),
            "risk_score": rng.uniform(0, 100, n),
            "status": rng.choice(["Healthy", "Warning", "Critical"], n),
        }
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_numeric_scaling_mean_and_std():
    """After StandardScaler the numeric features should have mean ≈ 0 and std ≈ 1."""
    df = _make_df(n=200)
    _, transformed_df = fit_preprocessor(df, {})

    for col in NUMERIC_FEATURES:
        vals = transformed_df[col].values
        assert abs(vals.mean()) < 0.1, f"{col} mean should be ~0, got {vals.mean():.4f}"
        assert abs(vals.std() - 1.0) < 0.1, f"{col} std should be ~1, got {vals.std():.4f}"


def test_transform_missing_field_raises_value_error():
    """transform() must raise ValueError with 'Missing required field: <field>' for absent columns."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    for missing_field in NUMERIC_FEATURES:
        incomplete_df = df[NUMERIC_FEATURES].drop(columns=[missing_field])
        with pytest.raises(ValueError, match=f"Missing required field: {missing_field}"):
            transform(pipeline, incomplete_df)


def test_transform_out_of_range_raises_value_error():
    """transform() must raise ValueError containing 'out of expected range' for out-of-range values."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    # Use temperature out of range (max is 200, so 201 is invalid)
    bad_df = df[NUMERIC_FEATURES].copy()
    bad_df.loc[bad_df.index[0], "temperature"] = 999.0

    with pytest.raises(ValueError, match="out of expected range"):
        transform(pipeline, bad_df)


def test_transform_out_of_range_negative_value():
    """transform() must raise ValueError for negative values (below min range)."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    bad_df = df[NUMERIC_FEATURES].copy()
    bad_df.loc[bad_df.index[0], "vibration"] = -1.0

    with pytest.raises(ValueError, match="out of expected range"):
        transform(pipeline, bad_df)


def test_transform_output_shape():
    """transform() output should have the same number of rows and all feature columns."""
    df = _make_df(n=40)
    pipeline, _ = fit_preprocessor(df, {})

    test_df = _make_df(n=10)
    result = transform(pipeline, test_df[NUMERIC_FEATURES])

    assert result.shape == (10, len(NUMERIC_FEATURES))
    assert list(result.columns) == NUMERIC_FEATURES
