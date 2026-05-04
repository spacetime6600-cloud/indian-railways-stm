"""Inference module for the Alert Prioritization module.

Loads a serialized model artifact and runs predictions on alert input dicts.
"""

import joblib
import pandas as pd

from src.alert_prioritization.preprocess import transform


def load_model(path: str):
    """Load a serialized model artifact from a .joblib file.

    Args:
        path: Path to the .joblib model file.

    Returns:
        The deserialized fitted model.
    """
    return joblib.load(path)


def predict(model, preprocessor, input_data: dict) -> dict:
    """Preprocess an alert input dict and return the predicted priority label.

    Args:
        model: A fitted sklearn-compatible classifier, or a dict with keys
               "xgb_model" and "label_encoder" for XGBoost models.
        preprocessor: A fitted sklearn Pipeline returned by fit_preprocessor.
        input_data: Dict with keys: alert_type, delay_impact, safety_risk,
                    affected_trains, route_busy, peak_hour.

    Returns:
        Dict with a single key "priority" mapping to the predicted label string.
    """
    df = pd.DataFrame([input_data])
    transformed = transform(preprocessor, df)
    if isinstance(model, dict) and "xgb_model" in model:
        raw = model["xgb_model"].predict(transformed)
        label = str(model["label_encoder"].inverse_transform(raw)[0])
    else:
        label = str(model.predict(transformed)[0])
    return {"priority": label}
