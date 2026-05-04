"""Unit tests for src/delay_prediction/train.py."""

import os
import sys
import tempfile
import types
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest
from sklearn.linear_model import LinearRegression

# ---------------------------------------------------------------------------
# Stub out xgboost before importing train.py to avoid libomp issues
# ---------------------------------------------------------------------------
_xgb_stub = types.ModuleType("xgboost")
_xgb_stub.XGBRegressor = MagicMock
sys.modules.setdefault("xgboost", _xgb_stub)

from src.delay_prediction.preprocess import fit_preprocessor  # noqa: E402
from src.delay_prediction.train import evaluate, save_model, train  # noqa: E402

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MINIMAL_CONFIG = {
    "random_seed": 42,
    "models": {
        "delay": {
            "xgb_n_estimators": 5,
        }
    },
    "logging": {"level": "INFO"},
    "paths": {"logs": "logs/"},
}


def _make_data(n=80, seed=42):
    """Return (X_transformed, y) using a small synthetic delay dataset."""
    rng = np.random.default_rng(seed)
    df = pd.DataFrame(
        {
            "distance": rng.uniform(10, 2000, n),
            "weather": rng.choice(["clear", "rain", "fog", "storm"], n),
            "congestion_level": rng.choice(["Low", "Medium", "High"], n),
            "previous_delay": rng.uniform(0, 120, n),
            "train_type": rng.choice(["express", "passenger", "freight"], n),
            "delay_minutes": rng.uniform(0, 180, n),
        }
    )
    pipeline, X_transformed = fit_preprocessor(df, {})
    y = df["delay_minutes"].reset_index(drop=True)
    return X_transformed, y


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_artifact_file_exists_after_save_model():
    """save_model() should produce a .joblib file at the given path."""
    X, y = _make_data()
    lr = LinearRegression()
    lr.fit(X, y)

    with tempfile.TemporaryDirectory() as tmpdir:
        model_path = os.path.join(tmpdir, "delay_prediction_model.joblib")
        save_model(lr, model_path)
        assert os.path.exists(model_path), "Model artifact file should exist after save_model()"


def test_evaluate_metric_keys_present_for_each_model():
    """evaluate() output must contain rmse and mae for each model."""
    X, y = _make_data(n=80)
    split = 60
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    lr = LinearRegression()
    lr.fit(X_train, y_train)

    # Mock XGBRegressor instance
    mock_xgb = MagicMock()
    mock_xgb.predict.return_value = y_test.values

    models = {"linear_regression": lr, "xgboost": mock_xgb}
    results = evaluate(models, X_test, y_test)

    for model_name in ("linear_regression", "xgboost"):
        assert model_name in results, f"Expected '{model_name}' key in evaluate() output"
        metrics = results[model_name]
        for key in ("rmse", "mae"):
            assert key in metrics, f"Expected metric key '{key}' in {model_name} evaluate() output"
            assert isinstance(metrics[key], float), f"Metric '{key}' for {model_name} should be a float"


def test_best_model_selection_lower_rmse_wins():
    """The model with the lower RMSE should be selected as best."""
    X, y = _make_data(n=40)
    split = 30
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    # Perfect model: predicts exact targets → RMSE = 0
    perfect_model = MagicMock()
    perfect_model.predict.return_value = y_test.values

    # Bad model: predicts all zeros → high RMSE
    bad_model = MagicMock()
    bad_model.predict.return_value = np.zeros(len(y_test))

    models = {"perfect": perfect_model, "bad": bad_model}
    results = evaluate(models, X_test, y_test)

    best_name = min(results, key=lambda k: results[k]["rmse"])
    assert best_name == "perfect", (
        f"Expected 'perfect' to be selected as best model (lower RMSE), got '{best_name}'"
    )


def test_train_returns_both_models():
    """train() should return a dict with 'linear_regression' and 'xgboost' keys."""
    X, y = _make_data(n=60)

    mock_xgb_instance = MagicMock()
    mock_xgb_instance.fit.return_value = mock_xgb_instance
    mock_xgb_instance.predict.return_value = y.values

    with patch("src.delay_prediction.train.XGBRegressor", return_value=mock_xgb_instance):
        models = train(X, y, MINIMAL_CONFIG)

    assert "linear_regression" in models, "train() should return 'linear_regression' key"
    assert "xgboost" in models, "train() should return 'xgboost' key"
    assert hasattr(models["linear_regression"], "predict"), "linear_regression should be a fitted estimator"
