"""Unit tests for src/congestion_detection/preprocess.py."""

import os
import tempfile

import numpy as np
import pandas as pd
import pytest

from src.congestion_detection.preprocess import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    fit_preprocessor,
    load_preprocessor,
    save_preprocessor,
    transform,
)


def _make_df(n=60, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame(
        {
            "train_density": rng.uniform(1, 50, n),
            "station_load": rng.uniform(100, 5000, n),
            "time_of_day": rng.choice(["morning", "afternoon", "evening", "night"], n),
            "route_type": rng.choice(["urban", "suburban", "intercity"], n),
            "congestion_level": rng.choice(["Low", "Medium", "High"], n),
        }
    )


# ---------------------------------------------------------------------------
# fit_preprocessor
# ---------------------------------------------------------------------------


def test_fit_returns_pipeline_and_dataframe():
    df = _make_df()
    pipeline, transformed_df = fit_preprocessor(df, {})
    assert transformed_df.shape == (len(df), len(ALL_FEATURES))
    assert list(transformed_df.columns) == NUMERIC_FEATURES + CATEGORICAL_FEATURES


def test_numeric_scaling():
    df = _make_df(n=200)
    _, transformed_df = fit_preprocessor(df, {})
    for col in NUMERIC_FEATURES:
        vals = transformed_df[col].values
        assert abs(vals.mean()) < 0.1, f"{col} mean should be ~0"
        assert abs(vals.std() - 1.0) < 0.1, f"{col} std should be ~1"


def test_categorical_encoding_produces_integers():
    df = _make_df(n=100)
    _, transformed_df = fit_preprocessor(df, {})
    for col in CATEGORICAL_FEATURES:
        vals = transformed_df[col].values
        assert all(v == int(v) for v in vals), f"{col} should contain integer-like floats"


# ---------------------------------------------------------------------------
# transform
# ---------------------------------------------------------------------------


def test_transform_output_shape():
    df = _make_df(n=60)
    pipeline, _ = fit_preprocessor(df, {})
    test_df = _make_df(n=10)
    result = transform(pipeline, test_df)
    assert result.shape == (10, len(ALL_FEATURES))
    assert list(result.columns) == NUMERIC_FEATURES + CATEGORICAL_FEATURES


def test_transform_missing_field_raises():
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})
    for field in ALL_FEATURES:
        incomplete = df[ALL_FEATURES].drop(columns=[field])
        with pytest.raises(ValueError, match=f"Missing required field: {field}"):
            transform(pipeline, incomplete)


def test_transform_unknown_time_of_day_raises():
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})
    bad = df[ALL_FEATURES].copy()
    bad.loc[bad.index[0], "time_of_day"] = "midnight"
    with pytest.raises(ValueError, match="Unexpected value 'midnight' for field 'time_of_day'"):
        transform(pipeline, bad)


def test_transform_unknown_route_type_raises():
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})
    bad = df[ALL_FEATURES].copy()
    bad.loc[bad.index[0], "route_type"] = "highway"
    with pytest.raises(ValueError, match="Unexpected value 'highway' for field 'route_type'"):
        transform(pipeline, bad)


# ---------------------------------------------------------------------------
# save / load
# ---------------------------------------------------------------------------


def test_save_and_load_preprocessor():
    df = _make_df()
    pipeline, _ = fit_preprocessor(df, {})
    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as f:
        path = f.name
    try:
        save_preprocessor(pipeline, path)
        loaded = load_preprocessor(path)
        test_df = _make_df(n=5)
        pd.testing.assert_frame_equal(transform(pipeline, test_df), transform(loaded, test_df))
    finally:
        os.unlink(path)
