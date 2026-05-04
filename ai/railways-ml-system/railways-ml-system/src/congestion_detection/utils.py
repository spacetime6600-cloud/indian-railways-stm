"""Congestion Detection module utilities.

Re-exports shared helpers from src.utils and defines congestion-specific constants.
"""

from src.utils import load_config, setup_logger

# Feature columns used by the congestion preprocessing pipeline
CONGESTION_FEATURES = [
    "train_density",
    "station_load",
    "time_of_day",
    "route_type",
]

# Congestion level labels
CONGESTION_LABELS = ["Low", "Medium", "High"]

# Default artifact paths
MODEL_PATH = "models/congestion_detection_model.joblib"
PREPROCESSOR_PATH = "models/congestion_detection_preprocessor.joblib"

__all__ = [
    "setup_logger",
    "load_config",
    "CONGESTION_FEATURES",
    "CONGESTION_LABELS",
    "MODEL_PATH",
    "PREPROCESSOR_PATH",
]
