"""Alert Prioritization module utilities.

Re-exports shared helpers from src.utils and defines alert-specific constants.
"""

from src.utils import load_config, setup_logger

# Alert type categories matching the synthetic data generator
ALERT_TYPES = [
    "signal_failure",
    "track_fault",
    "equipment_malfunction",
    "weather_disruption",
    "passenger_emergency",
]

# Priority label classes (ordered from highest to lowest severity)
PRIORITY_LABELS = ["Critical", "High", "Medium", "Low"]

# Default artifact paths
MODEL_PATH = "models/alert_prioritization_model.joblib"
PREPROCESSOR_PATH = "models/alert_prioritization_preprocessor.joblib"

__all__ = [
    "setup_logger",
    "load_config",
    "ALERT_TYPES",
    "PRIORITY_LABELS",
    "MODEL_PATH",
    "PREPROCESSOR_PATH",
]
