"""Inference module for the Delay Prediction module.

Loads a serialized model artifact and runs predictions on delay input dicts.
"""

import joblib
import pandas as pd

from src.delay_prediction.preprocess import transform


def load_model(path: str):
    """Load a serialized model artifact from a .joblib file.

    Args:
        path: Path to the .joblib model file.

    Returns:
        The deserialized fitted model.
    """
    return joblib.load(path)


def predict(model, preprocessor, input_data: dict) -> dict:
    """Preprocess a delay input dict and return the predicted delay in minutes.

    Args:
        model: A fitted sklearn-compatible regressor.
        preprocessor: A fitted sklearn Pipeline returned by fit_preprocessor.
        input_data: Dict with keys: distance, weather, congestion_level,
                    previous_delay, train_type.

    Returns:
        Dict with a single key "delay_minutes" mapping to a non-negative float.
    """
    df = pd.DataFrame([input_data])
    transformed = transform(preprocessor, df)
    raw_prediction = float(model.predict(transformed)[0])
    delay_minutes = max(0.0, raw_prediction)
    return {"delay_minutes": delay_minutes}
