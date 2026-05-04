"""Delay Prediction module utilities.

Re-exports shared helpers from src.utils and defines delay-specific constants.
"""

from src.utils import load_config, setup_logger

# Feature columns used by the delay preprocessing pipeline
DELAY_FEATURES = [
    "distance",
    "weather",
    "congestion_level",
    "previous_delay",
    "train_type",
]

# Default artifact paths
MODEL_PATH = "models/delay_prediction_model.joblib"
PREPROCESSOR_PATH = "models/delay_prediction_preprocessor.joblib"

__all__ = [
    "setup_logger",
    "load_config",
    "DELAY_FEATURES",
    "MODEL_PATH",
    "PREPROCESSOR_PATH",
]
