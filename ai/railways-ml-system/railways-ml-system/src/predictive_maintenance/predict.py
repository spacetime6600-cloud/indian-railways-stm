"""Inference module for the Predictive Maintenance module.

Loads serialized model artifacts and runs predictions on maintenance input dicts.
"""

import joblib
import pandas as pd

from src.predictive_maintenance.preprocess import transform


def load_model(path: str):
    """Load a serialized model artifact from a .joblib file.

    Args:
        path: Path to the .joblib model file.

    Returns:
        The deserialized fitted model.
    """
    return joblib.load(path)


def predict(regressor, classifier, preprocessor, input_data: dict) -> dict:
    """Preprocess a maintenance input dict and return risk score and status label.

    Args:
        regressor: A fitted sklearn-compatible regressor predicting risk_score.
        classifier: A fitted sklearn-compatible classifier predicting status.
        preprocessor: A fitted sklearn Pipeline returned by fit_preprocessor.
        input_data: Dict with keys: temperature, vibration, usage_hours,
                    last_service_days, fault_history.

    Returns:
        Dict with keys:
            "risk_score": float clamped to [0.0, 100.0]
            "status": predicted status label string
    """
    df = pd.DataFrame([input_data])
    transformed = transform(preprocessor, df)

    raw_score = float(regressor.predict(transformed)[0])
    risk_score = max(0.0, min(100.0, raw_score))

    status = str(classifier.predict(transformed)[0])

    return {"risk_score": risk_score, "status": status}
