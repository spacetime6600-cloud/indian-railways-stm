"""Pydantic request and response schemas for the Railways ML API."""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# XAI sub-model
# ---------------------------------------------------------------------------


class FeatureContribution(BaseModel):
    feature: str
    importance: float


class XAIInfo(BaseModel):
    confidence: Optional[float] = None
    top_features: list[FeatureContribution] = []


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class AlertRequest(BaseModel):
    alert_type: str
    delay_impact: float
    safety_risk: float
    affected_trains: int
    route_busy: int
    peak_hour: int


class MaintenanceRequest(BaseModel):
    temperature: float
    vibration: float
    usage_hours: float
    last_service_days: int
    fault_history: int


class DelayRequest(BaseModel):
    distance: float
    weather: str
    congestion_level: str
    previous_delay: float
    train_type: str


class CongestionRequest(BaseModel):
    train_density: float
    station_load: float
    time_of_day: str
    route_type: str


# ---------------------------------------------------------------------------
# Response models (with optional XAI)
# ---------------------------------------------------------------------------


class AlertResponse(BaseModel):
    priority: Literal["Critical", "High", "Medium", "Low"]
    xai: Optional[XAIInfo] = None


class MaintenanceResponse(BaseModel):
    risk_score: float
    status: Literal["Healthy", "Warning", "Critical"]
    xai: Optional[XAIInfo] = None


class DelayResponse(BaseModel):
    delay_minutes: float
    xai: Optional[XAIInfo] = None


class CongestionResponse(BaseModel):
    congestion_level: Literal["Low", "Medium", "High"]
    xai: Optional[XAIInfo] = None


# ---------------------------------------------------------------------------
# Batch request / response models
# ---------------------------------------------------------------------------


class BatchAlertRequest(BaseModel):
    items: list[AlertRequest]


class BatchAlertResponse(BaseModel):
    results: list[AlertResponse]


class BatchMaintenanceRequest(BaseModel):
    items: list[MaintenanceRequest]


class BatchMaintenanceResponse(BaseModel):
    results: list[MaintenanceResponse]


class BatchDelayRequest(BaseModel):
    items: list[DelayRequest]


class BatchDelayResponse(BaseModel):
    results: list[DelayResponse]


class BatchCongestionRequest(BaseModel):
    items: list[CongestionRequest]


class BatchCongestionResponse(BaseModel):
    results: list[CongestionResponse]


# ---------------------------------------------------------------------------
# Health / readiness
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str = "1.0.0"


class ReadinessResponse(BaseModel):
    status: Literal["ready", "not_ready"]
    artifacts_loaded: bool
    artifact_count: int


# ---------------------------------------------------------------------------
# Demo — full operational snapshot
# ---------------------------------------------------------------------------


class OperationalSnapshot(BaseModel):
    alert: AlertResponse
    maintenance: MaintenanceResponse
    delay: DelayResponse
    congestion: CongestionResponse
    summary: str
