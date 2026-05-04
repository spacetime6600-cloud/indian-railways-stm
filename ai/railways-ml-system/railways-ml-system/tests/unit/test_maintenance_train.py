"""Unit tests for src/predictive_maintenance/train.py."""

import os
import tempfile

import numpy as np
import pandas as pd
import pytest

from src.predictive_maintenance.preprocess import fit_preprocessor
from src.predictive_maintenance.train import evaluate, save_model, train

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MINIMAL_CONFIG = {
    "random_seed": 42,
    "models": {
        "maintenance": {
            "rf_n_estimators": 5,
        }
    },
    "logging": {"level": "INFO"},
    "paths": {"logs": "logs/"},
}


def _make_data(n=80, seed=42):
    """Return (X_transformed, y_reg, y_clf) using a small synthetic dataset."""
    rng = np.random.default_rng(seed)
    df = pd.DataFrame(
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
    pipeline, X_transformed = fit_preprocessor(df, {})
    y_reg = df["risk_score"].reset_index(drop=True)
    y_clf = df["status"].reset_index(drop=True)
    return X_transformed, y_reg, y_clf


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_both_artifact_files_exist_after_save_model():
    """save_model() should produce .joblib files for both regressor and classifier."""
    X, y_reg, y_clf = _make_data()
    models = train(X, y_reg, y_clf, MINIMAL_CONFIG)

    with tempfile.TemporaryDirectory() as tmpdir:
        regressor_path = os.path.join(tmpdir, "maintenance_regressor.joblib")
        classifier_path = os.path.join(tmpdir, "maintenance_classifier.joblib")

        save_model(models["regressor"], regressor_path)
        save_model(models["classifier"], classifier_path)

        assert os.path.exists(regressor_path), "Regressor artifact file should exist after save_model()"
        assert os.path.exists(classifier_path), "Classifier artifact file should exist after save_model()"


def test_evaluate_regressor_metric_keys_present():
    """evaluate() output must contain rmse and mae for the regressor."""
    X, y_reg, y_clf = _make_data(n=80)
    split = 60
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_reg_train, y_reg_test = y_reg.iloc[:split], y_reg.iloc[split:]
    y_clf_train, y_clf_test = y_clf.iloc[:split], y_clf.iloc[split:]

    models = train(X_train, y_reg_train, y_clf_train, MINIMAL_CONFIG)
    results = evaluate(models, X_test, y_reg_test, y_clf_test)

    assert "regressor" in results
    reg_metrics = results["regressor"]
    for key in ("rmse", "mae"):
        assert key in reg_metrics, f"Expected metric key '{key}' in regressor evaluate() output"
        assert isinstance(reg_metrics[key], float), f"Metric '{key}' should be a float"


def test_evaluate_classifier_metric_keys_present():
    """evaluate() output must contain accuracy and f1 for the classifier."""
    X, y_reg, y_clf = _make_data(n=80)
    split = 60
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_reg_train, y_reg_test = y_reg.iloc[:split], y_reg.iloc[split:]
    y_clf_train, y_clf_test = y_clf.iloc[:split], y_clf.iloc[split:]

    models = train(X_train, y_reg_train, y_clf_train, MINIMAL_CONFIG)
    results = evaluate(models, X_test, y_reg_test, y_clf_test)

    assert "classifier" in results
    clf_metrics = results["classifier"]
    for key in ("accuracy", "f1"):
        assert key in clf_metrics, f"Expected metric key '{key}' in classifier evaluate() output"
        assert isinstance(clf_metrics[key], float), f"Metric '{key}' should be a float"


def test_train_returns_regressor_and_classifier():
    """train() should return a dict with 'regressor' and 'classifier' keys."""
    X, y_reg, y_clf = _make_data(n=60)
    models = train(X, y_reg, y_clf, MINIMAL_CONFIG)

    assert "regressor" in models, "train() should return 'regressor' key"
    assert "classifier" in models, "train() should return 'classifier' key"
    assert hasattr(models["regressor"], "predict"), "regressor should be a fitted estimator"
    assert hasattr(models["classifier"], "predict"), "classifier should be a fitted estimator"
