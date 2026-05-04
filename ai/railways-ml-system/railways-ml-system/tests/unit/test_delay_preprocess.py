"""Unit tests for src/delay_prediction/preprocess.py."""

import tempfile
import os

import numpy as np
import pandas as pd
import pytest

from src.delay_prediction.preprocess import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    fit_preprocessor,
    load_preprocessor,
    save_preprocessor,
    transform,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_df(n=50, seed=0):
    """Return a small synthetic DataFrame with all required delay columns."""
    rng = np.random.default_rng(seed)
    return pd.DataFrame(
        {
            "distance": rng.uniform(10, 2000, n),
            "weather": rng.choice(["clear", "rain", "fog", "storm"], n),
            "congestion_level": rng.choice(["Low", "Medium", "High"], n),
            "previous_delay": rng.uniform(0, 120, n),
            "train_type": rng.choice(["express", "passenger", "freight"], n),
            "delay_minutes": rng.uniform(0, 180, n),
        }
    )


# ---------------------------------------------------------------------------
# fit_preprocessor tests
# ---------------------------------------------------------------------------


def test_fit_returns_pipeline_and_dataframe():
    """fit_preprocessor should return a (pipeline, DataFrame) tuple."""
    df = _make_df()
    pipeline, transformed_df = fit_preprocessor(df, {})
    assert transformed_df.shape == (len(df), len(ALL_FEATURES))
    assert list(transformed_df.columns) == NUMERIC_FEATURES + CATEGORICAL_FEATURES


def test_numeric_scaling_mean_and_std():
    """After StandardScaler the numeric features should have mean ≈ 0 and std ≈ 1."""
    df = _make_df(n=200)
    _, transformed_df = fit_preprocessor(df, {})

    for col in NUMERIC_FEATURES:
        vals = transformed_df[col].values
        assert abs(vals.mean()) < 0.1, f"{col} mean should be ~0, got {vals.mean():.4f}"
        assert abs(vals.std() - 1.0) < 0.1, f"{col} std should be ~1, got {vals.std():.4f}"


def test_categorical_encoding_produces_integers():
    """OrdinalEncoder should produce integer-like float values for categorical columns."""
    df = _make_df(n=100)
    _, transformed_df = fit_preprocessor(df, {})

    for col in CATEGORICAL_FEATURES:
        vals = transformed_df[col].values
        # OrdinalEncoder produces floats like 0.0, 1.0, 2.0
        assert all(v == int(v) for v in vals), f"{col} should contain integer-like floats"


# ---------------------------------------------------------------------------
# transform tests
# ---------------------------------------------------------------------------


def test_transform_output_shape():
    """transform() output should have the same number of rows and all feature columns."""
    df = _make_df(n=50)
    pipeline, _ = fit_preprocessor(df, {})

    test_df = _make_df(n=10)
    result = transform(pipeline, test_df)

    assert result.shape == (10, len(ALL_FEATURES))
    assert list(result.columns) == NUMERIC_FEATURES + CATEGORICAL_FEATURES


def test_transform_missing_field_raises_value_error():
    """transform() must raise ValueError with 'Missing required field: <field>' for absent columns."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    for missing_field in ALL_FEATURES:
        incomplete_df = df[ALL_FEATURES].drop(columns=[missing_field])
        with pytest.raises(ValueError, match=f"Missing required field: {missing_field}"):
            transform(pipeline, incomplete_df)


def test_transform_unknown_weather_raises_value_error():
    """transform() must raise ValueError with field name for unknown weather value."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    bad_df = df[ALL_FEATURES].copy()
    bad_df.loc[bad_df.index[0], "weather"] = "blizzard"

    with pytest.raises(ValueError, match="Unexpected value 'blizzard' for field 'weather'"):
        transform(pipeline, bad_df)


def test_transform_unknown_congestion_raises_value_error():
    """transform() must raise ValueError with field name for unknown congestion_level value."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    bad_df = df[ALL_FEATURES].copy()
    bad_df.loc[bad_df.index[0], "congestion_level"] = "Critical"

    with pytest.raises(ValueError, match="Unexpected value 'Critical' for field 'congestion_level'"):
        transform(pipeline, bad_df)


def test_transform_unknown_train_type_raises_value_error():
    """transform() must raise ValueError with field name for unknown train_type value."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    bad_df = df[ALL_FEATURES].copy()
    bad_df.loc[bad_df.index[0], "train_type"] = "bullet"

    with pytest.raises(ValueError, match="Unexpected value 'bullet' for field 'train_type'"):
        transform(pipeline, bad_df)


# ---------------------------------------------------------------------------
# save / load tests
# ---------------------------------------------------------------------------


def test_save_and_load_preprocessor():
    """save_preprocessor and load_preprocessor should round-trip the pipeline."""
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})

    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
        path = f.name

    try:
        save_preprocessor(pipeline, path)
        loaded = load_preprocessor(path)

        test_df = _make_df(n=5)
        original_result = transform(pipeline, test_df)
        loaded_result = transform(loaded, test_df)

        pd.testing.assert_frame_equal(original_result, loaded_result)
    finally:
        os.unlink(path)
