"""End-to-end integration tests for all four ML pipelines and the FastAPI service."""

import os
import tempfile

import numpy as np
import pandas as pd
import pytest
from sklearn.model_selection import train_test_split

CONFIG_PATH = "configs/config.yaml"


@pytest.fixture(scope="module")
def config():
    from src.utils import load_config
    return load_config(CONFIG_PATH)


# ---------------------------------------------------------------------------
# Alert Prioritization pipeline
# ---------------------------------------------------------------------------

def test_alert_pipeline_e2e(config, tmp_path):
    from src.data_generator import generate_alert_data
    from src.alert_prioritization.preprocess import fit_preprocessor, transform, save_preprocessor, load_preprocessor
    from src.alert_prioritization.train import train, evaluate, save_model
    from src.alert_prioritization.predict import load_model, predict

    df = generate_alert_data(config)
    assert len(df) >= 3000

    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["priority"])
    pipeline, X_train = fit_preprocessor(train_df, config)
    y_train = train_df["priority"].reset_index(drop=True)
    X_test = transform(pipeline, test_df[["alert_type", "delay_impact", "safety_risk", "affected_trains", "route_busy", "peak_hour"]])
    y_test = test_df["priority"].reset_index(drop=True)

    models = train(X_train, y_train, config)
    metrics = evaluate(models, X_test, y_test)
    assert "random_forest" in metrics

    model_path = str(tmp_path / "alert_model.joblib")
    pre_path = str(tmp_path / "alert_pre.joblib")
    best_name = max(metrics, key=lambda k: metrics[k]["f1"])
    save_model(models[best_name], model_path)
    save_preprocessor(pipeline, pre_path)

    assert os.path.exists(model_path)
    assert os.path.exists(pre_path)

    model = load_model(model_path)
    preprocessor = load_preprocessor(pre_path)
    sample = test_df.iloc[0][["alert_type", "delay_impact", "safety_risk", "affected_trains", "route_busy", "peak_hour"]].to_dict()
    result = predict(model, preprocessor, sample)
    assert result["priority"] in {"Critical", "High", "Medium", "Low"}


# ---------------------------------------------------------------------------
# Predictive Maintenance pipeline
# ---------------------------------------------------------------------------

def test_maintenance_pipeline_e2e(config, tmp_path):
    from src.data_generator import generate_maintenance_data
    from src.predictive_maintenance.preprocess import fit_preprocessor, transform, save_preprocessor, load_preprocessor
    from src.predictive_maintenance.train import train, evaluate, save_model
    from src.predictive_maintenance.predict import load_model, predict

    df = generate_maintenance_data(config)
    assert len(df) >= 3000

    features = ["temperature", "vibration", "usage_hours", "last_service_days", "fault_history"]
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
    pipeline, X_train = fit_preprocessor(train_df, config)
    y_train_reg = train_df["risk_score"].reset_index(drop=True)
    y_train_clf = train_df["status"].reset_index(drop=True)
    X_test = transform(pipeline, test_df[features])
    y_test_reg = test_df["risk_score"].reset_index(drop=True)
    y_test_clf = test_df["status"].reset_index(drop=True)

    models = train(X_train, y_train_reg, y_train_clf, config)
    metrics = evaluate(models, X_test, y_test_reg, y_test_clf)
    assert "regressor" in metrics
    assert "classifier" in metrics

    reg_path = str(tmp_path / "maint_reg.joblib")
    clf_path = str(tmp_path / "maint_clf.joblib")
    pre_path = str(tmp_path / "maint_pre.joblib")
    save_model(models["regressor"], reg_path)
    save_model(models["classifier"], clf_path)
    save_preprocessor(pipeline, pre_path)

    assert os.path.exists(reg_path)
    assert os.path.exists(clf_path)
    assert os.path.exists(pre_path)

    regressor = load_model(reg_path)
    classifier = load_model(clf_path)
    preprocessor = load_preprocessor(pre_path)
    sample = test_df.iloc[0][features].to_dict()
    result = predict(regressor, classifier, preprocessor, sample)
    assert 0.0 <= result["risk_score"] <= 100.0
    assert result["status"] in {"Healthy", "Warning", "Critical"}


# ---------------------------------------------------------------------------
# Delay Prediction pipeline
# ---------------------------------------------------------------------------

def test_delay_pipeline_e2e(config, tmp_path):
    from src.data_generator import generate_delay_data
    from src.delay_prediction.preprocess import fit_preprocessor, transform, save_preprocessor, load_preprocessor
    from src.delay_prediction.train import train, evaluate, save_model
    from src.delay_prediction.predict import load_model, predict

    df = generate_delay_data(config)
    assert len(df) >= 3000

    features = ["distance", "weather", "congestion_level", "previous_delay", "train_type"]
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
    pipeline, X_train = fit_preprocessor(train_df, config)
    y_train = train_df["delay_minutes"].reset_index(drop=True)
    X_test = transform(pipeline, test_df[features])
    y_test = test_df["delay_minutes"].reset_index(drop=True)

    models = train(X_train, y_train, config)
    metrics = evaluate(models, X_test, y_test)
    assert "linear_regression" in metrics

    model_path = str(tmp_path / "delay_model.joblib")
    pre_path = str(tmp_path / "delay_pre.joblib")
    best_name = min(metrics, key=lambda k: metrics[k]["rmse"])
    save_model(models[best_name], model_path)
    save_preprocessor(pipeline, pre_path)

    assert os.path.exists(model_path)
    assert os.path.exists(pre_path)

    model = load_model(model_path)
    preprocessor = load_preprocessor(pre_path)
    sample = test_df.iloc[0][features].to_dict()
    result = predict(model, preprocessor, sample)
    assert result["delay_minutes"] >= 0.0


# ---------------------------------------------------------------------------
# Congestion Detection pipeline
# ---------------------------------------------------------------------------

def test_congestion_pipeline_e2e(config, tmp_path):
    from src.data_generator import generate_congestion_data
    from src.congestion_detection.preprocess import fit_preprocessor, transform, save_preprocessor, load_preprocessor
    from src.congestion_detection.train import train, evaluate, save_model
    from src.congestion_detection.predict import load_model, predict

    df = generate_congestion_data(config)
    assert len(df) >= 3000

    features = ["train_density", "station_load", "time_of_day", "route_type"]
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["congestion_level"])
    pipeline, X_train = fit_preprocessor(train_df, config)
    y_train = train_df["congestion_level"].reset_index(drop=True)
    X_test = transform(pipeline, test_df[features])
    y_test = test_df["congestion_level"].reset_index(drop=True)

    models = train(X_train, y_train, config)
    metrics = evaluate(models, X_test, y_test)
    assert "random_forest" in metrics

    model_path = str(tmp_path / "cong_model.joblib")
    pre_path = str(tmp_path / "cong_pre.joblib")
    save_model(models["random_forest"], model_path)
    save_preprocessor(pipeline, pre_path)

    assert os.path.exists(model_path)
    assert os.path.exists(pre_path)

    model = load_model(model_path)
    preprocessor = load_preprocessor(pre_path)
    sample = test_df.iloc[0][features].to_dict()
    result = predict(model, preprocessor, sample)
    assert result["congestion_level"] in {"Low", "Medium", "High"}


# ---------------------------------------------------------------------------
# API startup + all four endpoints
# ---------------------------------------------------------------------------

def test_api_all_endpoints_respond_200(config):
    """API startup test: load real artifacts and assert all endpoints return HTTP 200."""
    from api.dependencies import load_all_artifacts
    from api.main import app
    from fastapi.testclient import TestClient

    # Ensure all artifacts exist (trained in task 7)
    try:
        artifacts = load_all_artifacts(config)
    except FileNotFoundError as e:
        pytest.skip(f"Model artifacts not found — run training first: {e}")

    with TestClient(app) as client:
        resp = client.post("/predict-alert", json={
            "alert_type": "signal_failure", "delay_impact": 5.0,
            "safety_risk": 0.5, "affected_trains": 2, "route_busy": 1, "peak_hour": 0,
        })
        assert resp.status_code == 200
        assert resp.json()["priority"] in {"Critical", "High", "Medium", "Low"}

        resp = client.post("/predict-maintenance", json={
            "temperature": 70.0, "vibration": 3.0, "usage_hours": 5000.0,
            "last_service_days": 20, "fault_history": 1,
        })
        assert resp.status_code == 200
        assert 0.0 <= resp.json()["risk_score"] <= 100.0
        assert resp.json()["status"] in {"Healthy", "Warning", "Critical"}

        resp = client.post("/predict-delay", json={
            "distance": 300.0, "weather": "clear", "congestion_level": "Low",
            "previous_delay": 0.0, "train_type": "express",
        })
        assert resp.status_code == 200
        assert resp.json()["delay_minutes"] >= 0.0

        resp = client.post("/predict-congestion", json={
            "train_density": 10.0, "station_load": 800.0,
            "time_of_day": "morning", "route_type": "urban",
        })
        assert resp.status_code == 200
        assert resp.json()["congestion_level"] in {"Low", "Medium", "High"}
