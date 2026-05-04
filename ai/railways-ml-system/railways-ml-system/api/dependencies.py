"""Artifact loading helpers for the Railways ML API."""

import os

import joblib


ARTIFACT_KEYS = {
    "alert_model": "models/alert_prioritization_model.joblib",
    "alert_preprocessor": "models/alert_prioritization_preprocessor.joblib",
    "maintenance_regressor": "models/maintenance_regressor.joblib",
    "maintenance_classifier": "models/maintenance_classifier.joblib",
    "maintenance_preprocessor": "models/maintenance_preprocessor.joblib",
    "delay_model": "models/delay_prediction_model.joblib",
    "delay_preprocessor": "models/delay_prediction_preprocessor.joblib",
    "congestion_model": "models/congestion_detection_model.joblib",
    "congestion_preprocessor": "models/congestion_detection_preprocessor.joblib",
}


def load_all_artifacts(config: dict) -> dict:
    """Load all nine model and preprocessor artifacts from disk.

    Args:
        config: Configuration dict; uses config['paths']['models'] as the
                base directory for artifact paths.

    Returns:
        Dict mapping artifact key names to loaded objects.

    Raises:
        FileNotFoundError: If any required artifact file is missing.
    """
    models_dir = config.get("paths", {}).get("models", "models/")
    artifacts = {}

    for key, rel_path in ARTIFACT_KEYS.items():
        # Support both absolute paths and paths relative to models_dir
        full_path = rel_path if os.path.isabs(rel_path) else rel_path
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Required model artifact not found: {full_path}")
        artifacts[key] = joblib.load(full_path)

    return artifacts
