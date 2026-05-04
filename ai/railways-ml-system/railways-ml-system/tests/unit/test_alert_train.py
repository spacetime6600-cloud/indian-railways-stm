"""Unit tests for src/alert_prioritization/train.py."""

import os
import sys
import tempfile
import types
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import RandomForestClassifier

# ---------------------------------------------------------------------------
# Stub out xgboost before importing train.py to avoid libomp issues
# ---------------------------------------------------------------------------
_xgb_stub = types.ModuleType("xgboost")
_xgb_stub.XGBClassifier = MagicMock  # will be replaced per-test via patch
sys.modules.setdefault("xgboost", _xgb_stub)

from src.alert_prioritization.preprocess import fit_preprocessor  # noqa: E402
from src.alert_prioritization.train import evaluate, save_model, train  # noqa: E402

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

KNOWN_ALERT_TYPES = ["Critical", "High", "Medium", "Low"]

MINIMAL_CONFIG = {
    "random_seed": 42,
    "models": {
        "alert": {
            "rf_n_estimators": 5,
            "xgb_n_estimators": 5,
        }
    },
    "logging": {"level": "INFO"},
    "paths": {"logs": "logs/"},
}


def _make_data(n=80):
    """Return (X_transformed, y) using a small synthetic dataset."""
    rng = np.random.default_rng(42)
    alert_types = [KNOWN_ALERT_TYPES[i % len(KNOWN_ALERT_TYPES)] for i in range(n)]
    df = pd.DataFrame(
        {
            "alert_type": alert_types,
            "delay_impact": rng.uniform(0, 10, n),
            "safety_risk": rng.uniform(0, 10, n),
            "affected_trains": rng.integers(1, 20, n).astype(float),
            "route_busy": rng.uniform(0, 1, n),
            "peak_hour": rng.integers(0, 2, n).astype(float),
            "priority": [i % 4 for i in range(n)],
        }
    )
    pipeline, X_transformed = fit_preprocessor(df, {})
    y = df["priority"].reset_index(drop=True)
    return X_transformed, y


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_artifact_file_exists_after_save_model():
    """save_model() should produce a .joblib file at the given path."""
    X, y = _make_data()
    rf = RandomForestClassifier(n_estimators=5, random_state=42)
    rf.fit(X, y)

    with tempfile.TemporaryDirectory() as tmpdir:
        model_path = os.path.join(tmpdir, "alert_prioritization_model.joblib")
        save_model(rf, model_path)
        assert os.path.exists(model_path), "Model artifact file should exist after save_model()"


def test_evaluate_metric_keys_present():
    """evaluate() output must contain accuracy, precision, recall, and f1 for each model."""
    X, y = _make_data(n=80)
    split = 60
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    rf = RandomForestClassifier(n_estimators=5, random_state=42)
    rf.fit(X_train, y_train)

    results = evaluate({"random_forest": rf}, X_test, y_test)

    assert "random_forest" in results
    metrics = results["random_forest"]
    for key in ("accuracy", "precision", "recall", "f1"):
        assert key in metrics, f"Expected metric key '{key}' in evaluate() output"
        assert isinstance(metrics[key], float), f"Metric '{key}' should be a float"


def test_best_model_selection_by_f1():
    """The model with the higher F1 score should be selected as best."""
    # Build two mock models with known F1 scores via mocked predictions
    X, y = _make_data(n=40)
    split = 30
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    # Train a real RF so we have a valid estimator
    rf = RandomForestClassifier(n_estimators=5, random_state=42)
    rf.fit(X_train, y_train)

    # Mock two models: one predicts perfectly, one predicts all zeros
    perfect_model = MagicMock()
    perfect_model.predict.return_value = y_test.values

    bad_model = MagicMock()
    bad_model.predict.return_value = np.zeros(len(y_test), dtype=int)

    models = {"perfect": perfect_model, "bad": bad_model}
    results = evaluate(models, X_test, y_test)

    best_name = max(results, key=lambda k: results[k]["f1"])
    assert best_name == "perfect", (
        f"Expected 'perfect' to be selected as best model, got '{best_name}'"
    )


def test_train_returns_both_models():
    """train() should return a dict with 'random_forest' and 'xgboost' keys."""
    X, y = _make_data(n=60)

    # Mock XGBClassifier to avoid libomp dependency issues
    mock_xgb_instance = MagicMock()
    mock_xgb_instance.fit.return_value = mock_xgb_instance
    mock_xgb_instance.predict.return_value = y.values

    with patch("src.alert_prioritization.train.XGBClassifier", return_value=mock_xgb_instance):
        models = train(X, y, MINIMAL_CONFIG)

    assert "random_forest" in models, "train() should return 'random_forest' key"
    assert "xgboost" in models, "train() should return 'xgboost' key"
    assert hasattr(models["random_forest"], "predict"), "random_forest should be a fitted estimator"
