"""FastAPI application for the Railways ML prediction service.

Features:
  - Health + readiness endpoints
  - Single and batch prediction endpoints for all four modules
  - Lite XAI: confidence score + top feature contributions per prediction
  - Observability: structured logging of inputs, outputs, and latency
  - Killer demo route: full operational snapshot from one request
"""

from __future__ import annotations

import logging
import traceback
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.dependencies import load_all_artifacts
from api.observability import Timer, log_prediction
from api.schemas import (
    AlertRequest, AlertResponse,
    BatchAlertRequest, BatchAlertResponse,
    BatchCongestionRequest, BatchCongestionResponse,
    BatchDelayRequest, BatchDelayResponse,
    BatchMaintenanceRequest, BatchMaintenanceResponse,
    CongestionRequest, CongestionResponse,
    DelayRequest, DelayResponse,
    HealthResponse,
    MaintenanceRequest, MaintenanceResponse,
    OperationalSnapshot,
    ReadinessResponse,
)
from api.xai import get_confidence_and_explanation
from src.utils import load_config, setup_logger

CONFIG_PATH = "configs/config.yaml"

_artifacts: dict = {}
_logger: logging.Logger = logging.getLogger("api")

# Feature name lists (must match preprocessor column order: numeric first, then categorical)
_ALERT_FEATURES = ["delay_impact", "safety_risk", "affected_trains", "route_busy", "peak_hour", "alert_type"]
_MAINTENANCE_FEATURES = ["temperature", "vibration", "usage_hours", "last_service_days", "fault_history"]
_DELAY_FEATURES = ["distance", "previous_delay", "weather", "congestion_level", "train_type"]
_CONGESTION_FEATURES = ["train_density", "station_load", "time_of_day", "route_type"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _artifacts, _logger
    try:
        cfg = load_config(CONFIG_PATH)
        _logger = setup_logger("api", cfg)
        _logger.info("Loading model artifacts...")
        _artifacts = load_all_artifacts(cfg)
        _logger.info("All %d artifacts loaded successfully.", len(_artifacts))
    except FileNotFoundError as exc:
        logging.getLogger("api").error("Startup failed — missing artifact: %s", exc)
        raise
    yield
    _artifacts.clear()


app = FastAPI(title="Railways ML API", version="1.0.0", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    _logger.error("Unhandled exception on %s:\n%s", request.url, traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": "Internal prediction error"})


# ---------------------------------------------------------------------------
# Health + Readiness
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse, tags=["ops"])
async def health():
    """Liveness probe — always returns 200 if the process is up."""
    return HealthResponse(status="ok")


@app.get("/ready", response_model=ReadinessResponse, tags=["ops"])
async def readiness():
    """Readiness probe — returns ready only when all artifacts are loaded."""
    loaded = len(_artifacts) > 0
    return ReadinessResponse(
        status="ready" if loaded else "not_ready",
        artifacts_loaded=loaded,
        artifact_count=len(_artifacts),
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _safe_xai(model, preprocessor, input_data: dict, feature_names: list, module: str) -> dict:
    """Run XAI computation; return empty dict on any failure (never breaks predictions)."""
    try:
        import pandas as pd
        _TRANSFORM_MAP = {
            "alert": "src.alert_prioritization.preprocess",
            "maintenance": "src.predictive_maintenance.preprocess",
            "delay": "src.delay_prediction.preprocess",
            "congestion": "src.congestion_detection.preprocess",
        }
        import importlib
        mod = importlib.import_module(_TRANSFORM_MAP[module])
        df = pd.DataFrame([input_data])
        transformed = mod.transform(preprocessor, df)
        return get_confidence_and_explanation(model, transformed, feature_names)
    except Exception:
        return {"confidence": None, "top_features": []}


def _alert_predict(body: AlertRequest) -> AlertResponse:
    from src.alert_prioritization.predict import predict
    with Timer() as t:
        result = predict(_artifacts["alert_model"], _artifacts["alert_preprocessor"], body.model_dump())
    xai = _safe_xai(_artifacts["alert_model"], _artifacts["alert_preprocessor"], body.model_dump(), _ALERT_FEATURES, "alert")
    log_prediction("predict-alert", body.model_dump(), result, t.ms, xai.get("confidence"))
    return AlertResponse(**result, xai=xai)


def _maintenance_predict(body: MaintenanceRequest) -> MaintenanceResponse:
    from src.predictive_maintenance.predict import predict
    with Timer() as t:
        result = predict(
            _artifacts["maintenance_regressor"],
            _artifacts["maintenance_classifier"],
            _artifacts["maintenance_preprocessor"],
            body.model_dump(),
        )
    xai = _safe_xai(_artifacts["maintenance_classifier"], _artifacts["maintenance_preprocessor"], body.model_dump(), _MAINTENANCE_FEATURES, "maintenance")
    log_prediction("predict-maintenance", body.model_dump(), result, t.ms, xai.get("confidence"))
    return MaintenanceResponse(**result, xai=xai)


def _delay_predict(body: DelayRequest) -> DelayResponse:
    from src.delay_prediction.predict import predict
    with Timer() as t:
        result = predict(_artifacts["delay_model"], _artifacts["delay_preprocessor"], body.model_dump())
    xai = _safe_xai(_artifacts["delay_model"], _artifacts["delay_preprocessor"], body.model_dump(), _DELAY_FEATURES, "delay")
    log_prediction("predict-delay", body.model_dump(), result, t.ms, xai.get("confidence"))
    return DelayResponse(**result, xai=xai)


def _congestion_predict(body: CongestionRequest) -> CongestionResponse:
    from src.congestion_detection.predict import predict
    with Timer() as t:
        result = predict(_artifacts["congestion_model"], _artifacts["congestion_preprocessor"], body.model_dump())
    xai = _safe_xai(_artifacts["congestion_model"], _artifacts["congestion_preprocessor"], body.model_dump(), _CONGESTION_FEATURES, "congestion")
    log_prediction("predict-congestion", body.model_dump(), result, t.ms, xai.get("confidence"))
    return CongestionResponse(**result, xai=xai)


# ---------------------------------------------------------------------------
# Single prediction endpoints
# ---------------------------------------------------------------------------


@app.post("/predict-alert", response_model=AlertResponse, tags=["predict"])
async def predict_alert(body: AlertRequest):
    return _alert_predict(body)


@app.post("/predict-maintenance", response_model=MaintenanceResponse, tags=["predict"])
async def predict_maintenance(body: MaintenanceRequest):
    return _maintenance_predict(body)


@app.post("/predict-delay", response_model=DelayResponse, tags=["predict"])
async def predict_delay(body: DelayRequest):
    return _delay_predict(body)


@app.post("/predict-congestion", response_model=CongestionResponse, tags=["predict"])
async def predict_congestion(body: CongestionRequest):
    return _congestion_predict(body)


# ---------------------------------------------------------------------------
# Batch prediction endpoints
# ---------------------------------------------------------------------------


@app.post("/batch/predict-alert", response_model=BatchAlertResponse, tags=["batch"])
async def batch_predict_alert(body: BatchAlertRequest):
    return BatchAlertResponse(results=[_alert_predict(item) for item in body.items])


@app.post("/batch/predict-maintenance", response_model=BatchMaintenanceResponse, tags=["batch"])
async def batch_predict_maintenance(body: BatchMaintenanceRequest):
    return BatchMaintenanceResponse(results=[_maintenance_predict(item) for item in body.items])


@app.post("/batch/predict-delay", response_model=BatchDelayResponse, tags=["batch"])
async def batch_predict_delay(body: BatchDelayRequest):
    return BatchDelayResponse(results=[_delay_predict(item) for item in body.items])


@app.post("/batch/predict-congestion", response_model=BatchCongestionResponse, tags=["batch"])
async def batch_predict_congestion(body: BatchCongestionRequest):
    return BatchCongestionResponse(results=[_congestion_predict(item) for item in body.items])


# ---------------------------------------------------------------------------
# Demo — full operational snapshot
# ---------------------------------------------------------------------------


@app.post("/demo/operational-snapshot", response_model=OperationalSnapshot, tags=["demo"])
async def operational_snapshot(
    alert: AlertRequest,
    maintenance: MaintenanceRequest,
    delay: DelayRequest,
    congestion: CongestionRequest,
):
    """Single call that runs all four models and returns a unified operational snapshot.

    Useful for dashboards and integration demos — one request, full situational awareness.
    """
    alert_resp = _alert_predict(alert)
    maint_resp = _maintenance_predict(maintenance)
    delay_resp = _delay_predict(delay)
    cong_resp = _congestion_predict(congestion)

    # Build a human-readable summary
    summary = (
        f"Alert priority: {alert_resp.priority} | "
        f"Maintenance: {maint_resp.status} (risk {maint_resp.risk_score:.1f}/100) | "
        f"Delay: {delay_resp.delay_minutes:.1f} min | "
        f"Congestion: {cong_resp.congestion_level}"
    )

    return OperationalSnapshot(
        alert=alert_resp,
        maintenance=maint_resp,
        delay=delay_resp,
        congestion=cong_resp,
        summary=summary,
    )
