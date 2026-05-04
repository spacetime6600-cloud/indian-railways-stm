"""Unit tests for src/congestion_detection/train.py."""

import os
import tempfile

import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import RandomForestClassifier
from unittest.mock import MagicMock

from src.congestion_detection.preprocess import fit_preprocessor
from src.congestion_detection.train import evaluate, save_model, train

MINIMAL_CONFIG = {
    "random_seed": 42,
    "models": {
        "congestion": {
            "rf_n_estimators": 5,
            "kmeans_n_clusters": 3,
        }
    },
    "logging": {"level": "INFO"},
    "paths": {"logs": "logs/"},
}


def _make_data(n=90):
    rng = np.random.default_rng(42)
    df = pd.DataFrame(
        {
            "train_density": rng.uniform(1, 50, n),
            "station_load": rng.uniform(100, 5000, n),
            "time_of_day": rng.choice(["morning", "afternoon", "evening", "night"], n),
            "route_type": rng.choice(["urban", "suburban", "intercity"], n),
            "congestion_level": rng.choice(["Low", "Medium", "High"], n),
        }
    )
    pipeline, X_transformed = fit_preprocessor(df, {})
    y = df["congestion_level"].reset_index(drop=True)
    return X_transformed, y


def test_train_returns_both_models():
    X, y = _make_data()
    models = train(X, y, MINIMAL_CONFIG)
    assert "random_forest" in models
    assert "kmeans" in models
    assert hasattr(models["random_forest"], "predict")
    assert hasattr(models["kmeans"], "predict")


def test_artifact_file_exists_after_save_model():
    X, y = _make_data()
    rf = RandomForestClassifier(n_estimators=5, random_state=42)
    rf.fit(X, y)
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "congestion_detection_model.joblib")
        save_model(rf, path)
        assert os.path.exists(path)


def test_evaluate_metric_keys_present():
    X, y = _make_data(n=90)
    split = 70
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    rf = RandomForestClassifier(n_estimators=5, random_state=42)
    rf.fit(X_train, y_train)

    results = evaluate({"random_forest": rf}, X_test, y_test)
    assert "random_forest" in results
    for key in ("accuracy", "precision", "recall", "f1"):
        assert key in results["random_forest"]
        assert isinstance(results["random_forest"][key], float)
