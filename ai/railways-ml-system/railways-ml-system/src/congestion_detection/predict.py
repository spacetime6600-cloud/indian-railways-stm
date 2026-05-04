"""
Inference module for the Congestion Detection system.

Handles loading the trained model and making predictions on new input data.
Ensures output is always a valid congestion label: Low, Medium, High.
"""

import joblib
import pandas as pd

from src.congestion_detection.preprocess import transform

# Standard label mapping (ensures consistency across system)
LABEL_MAP = {
    0: "Low",
    1: "Medium",
    2: "High"
}


def load_model(path: str):
    """
    Load a serialized model artifact.

    Args:
        path (str): Path to the .joblib model file

    Returns:
        model: Loaded ML model
    """
    return joblib.load(path)


def predict(model, preprocessor, input_data: dict) -> dict:
    """
    Predict congestion level from input features.

    Args:
        model: Trained RandomForestClassifier
        preprocessor: Fitted preprocessing pipeline
        input_data (dict): Input features
            {
                "train_density": float,
                "station_load": float,
                "time_of_day": str,
                "route_type": str
            }

    Returns:
        dict:
            {
                "congestion_level": "Low" | "Medium" | "High"
            }
    """
    try:
        # Convert input to DataFrame
        df = pd.DataFrame([input_data])

        # Apply preprocessing
        transformed = transform(preprocessor, df)

        # Model prediction
        pred = model.predict(transformed)

        # Handle array output from sklearn
        if hasattr(pred, "__iter__"):
            pred = pred[0]

        # Convert numeric prediction → label
        if isinstance(pred, (int, float)):
            pred = int(pred)
            label = LABEL_MAP.get(pred, "Medium")  # fallback safety
        else:
            label = str(pred)

        return {"congestion_level": label}

    except Exception as e:
        raise ValueError(f"Prediction error in congestion model: {str(e)}")