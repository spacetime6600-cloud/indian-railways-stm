"""Unit tests for api/main.py endpoints."""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Valid request bodies
# ---------------------------------------------------------------------------

VALID_ALERT = {
    "alert_type": "signal_failure",
    "delay_impact": 10.0,
    "safety_risk": 0.8,
    "affected_trains": 3,
    "route_busy": 1,
    "peak_hour": 1,
}

VALID_MAINTENANCE = {
    "temperature": 75.0,
    "vibration": 5.0,
    "usage_hours": 10000.0,
    "last_service_days": 30,
    "fault_history": 2,
}

VALID_DELAY = {
    "distance": 500.0,
    "weather": "clear",
    "congestion_level": "Low",
    "previous_delay": 5.0,
    "train_type": "express",
}

VALID_CONGESTION = {
    "train_density": 20.0,
    "station_load": 1500.0,
    "time_of_day": "morning",
    "route_type": "urban",
}

# ---------------------------------------------------------------------------
# Mock artifacts fixture
# ---------------------------------------------------------------------------

def _make_mock_artifacts():
    """Return a dict of mock model/preprocessor objects."""
    alert_model = MagicMock()
    alert_model.predict.return_value = ["High"]
    alert_pre = MagicMock()

    maint_reg = MagicMock()
    maint_reg.predict.return_value = [45.0]
    maint_clf = MagicMock()
    maint_clf.predict.return_value = ["Warning"]
    maint_pre = MagicMock()

    delay_model = MagicMock()
    delay_model.predict.return_value = [12.5]
    delay_pre = MagicMock()

    cong_model = MagicMock()
    cong_model.predict.return_value = ["Medium"]
    cong_pre = MagicMock()

    return {
        "alert_model": alert_model,
        "alert_preprocessor": alert_pre,
        "maintenance_regressor": maint_reg,
        "maintenance_classifier": maint_clf,
        "maintenance_preprocessor": maint_pre,
        "delay_model": delay_model,
        "delay_preprocessor": delay_pre,
        "congestion_model": cong_model,
        "congestion_preprocessor": cong_pre,
    }


@pytest.fixture
def client():
    """TestClient with mocked artifact loading and predict functions."""
    mock_artifacts = _make_mock_artifacts()

    with patch("api.main.load_all_artifacts", return_value=mock_artifacts), \
         patch("api.main.load_config", return_value={
             "random_seed": 42, "data": {}, "models": {}, "paths": {"logs": "logs/", "models": "models/"},
             "logging": {"level": "INFO", "max_bytes": 10485760, "backup_count": 5},
         }), \
         patch("src.alert_prioritization.predict.predict", return_value={"priority": "High"}), \
         patch("src.predictive_maintenance.predict.predict", return_value={"risk_score": 45.0, "status": "Warning"}), \
         patch("src.delay_prediction.predict.predict", return_value={"delay_minutes": 12.5}), \
         patch("src.congestion_detection.predict.predict", return_value={"congestion_level": "Medium"}):

        from api.main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


# ---------------------------------------------------------------------------
# HTTP 200 tests
# ---------------------------------------------------------------------------

def test_predict_alert_200(client):
    resp = client.post("/predict-alert", json=VALID_ALERT)
    assert resp.status_code == 200
    assert "priority" in resp.json()


def test_predict_maintenance_200(client):
    resp = client.post("/predict-maintenance", json=VALID_MAINTENANCE)
    assert resp.status_code == 200
    data = resp.json()
    assert "risk_score" in data
    assert "status" in data


def test_predict_delay_200(client):
    resp = client.post("/predict-delay", json=VALID_DELAY)
    assert resp.status_code == 200
    assert "delay_minutes" in resp.json()


def test_predict_congestion_200(client):
    resp = client.post("/predict-congestion", json=VALID_CONGESTION)
    assert resp.status_code == 200
    assert "congestion_level" in resp.json()


# ---------------------------------------------------------------------------
# HTTP 422 — missing required field
# ---------------------------------------------------------------------------

def test_predict_alert_422_missing_field(client):
    body = {k: v for k, v in VALID_ALERT.items() if k != "alert_type"}
    resp = client.post("/predict-alert", json=body)
    assert resp.status_code == 422


def test_predict_maintenance_422_missing_field(client):
    body = {k: v for k, v in VALID_MAINTENANCE.items() if k != "temperature"}
    resp = client.post("/predict-maintenance", json=body)
    assert resp.status_code == 422


def test_predict_delay_422_missing_field(client):
    body = {k: v for k, v in VALID_DELAY.items() if k != "distance"}
    resp = client.post("/predict-delay", json=body)
    assert resp.status_code == 422


def test_predict_congestion_422_missing_field(client):
    body = {k: v for k, v in VALID_CONGESTION.items() if k != "train_density"}
    resp = client.post("/predict-congestion", json=body)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# HTTP 422 — wrong field type
# ---------------------------------------------------------------------------

def test_predict_alert_422_wrong_type(client):
    body = {**VALID_ALERT, "delay_impact": "not_a_number"}
    resp = client.post("/predict-alert", json=body)
    assert resp.status_code == 422


def test_predict_delay_422_wrong_type(client):
    body = {**VALID_DELAY, "distance": "far"}
    resp = client.post("/predict-delay", json=body)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# HTTP 500 — mocked model exception
# ---------------------------------------------------------------------------

def test_predict_alert_500_on_model_exception(client):
    with patch("src.alert_prioritization.predict.predict", side_effect=RuntimeError("model exploded")):
        resp = client.post("/predict-alert", json=VALID_ALERT)
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Internal prediction error"


# ---------------------------------------------------------------------------
# Startup failure — missing artifact
# ---------------------------------------------------------------------------

def test_startup_failure_on_missing_artifact():
    with patch("api.main.load_all_artifacts", side_effect=FileNotFoundError("models/missing.joblib")), \
         patch("api.main.load_config", return_value={
             "random_seed": 42, "data": {}, "models": {}, "paths": {"logs": "logs/", "models": "models/"},
             "logging": {"level": "INFO", "max_bytes": 10485760, "backup_count": 5},
         }):
        from api.main import app
        with pytest.raises(FileNotFoundError):
            with TestClient(app):
                pass
