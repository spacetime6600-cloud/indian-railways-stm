"""Predictive Maintenance module utilities.

Re-exports shared helpers from src.utils and defines maintenance-specific constants.
"""

from src.utils import load_config, setup_logger

# Feature columns used by the maintenance preprocessing pipeline
MAINTENANCE_FEATURES = [
    "temperature",
    "vibration",
    "usage_hours",
    "last_service_days",
    "fault_history",
]

# Status label classes (ordered from lowest to highest severity)
STATUS_LABELS = ["Healthy", "Warning", "Critical"]

# Default artifact paths
REGRESSOR_PATH = "models/maintenance_regressor.joblib"
CLASSIFIER_PATH = "models/maintenance_classifier.joblib"
PREPROCESSOR_PATH = "models/maintenance_preprocessor.joblib"

__all__ = [
    "setup_logger",
    "load_config",
    "MAINTENANCE_FEATURES",
    "STATUS_LABELS",
    "REGRESSOR_PATH",
    "CLASSIFIER_PATH",
    "PREPROCESSOR_PATH",
]
