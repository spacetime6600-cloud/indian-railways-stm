"""Preprocessing pipeline for the Predictive Maintenance module.

Scales all numeric features with StandardScaler inside a single sklearn Pipeline.
No categorical features exist for this module.
"""

import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

NUMERIC_FEATURES = [
    "temperature",
    "vibration",
    "usage_hours",
    "last_service_days",
    "fault_history",
]

# Expected value ranges for validation: {field: (min, max)}
FEATURE_RANGES = {
    "temperature": (0, 200),
    "vibration": (0, 50),
    "usage_hours": (0, 100000),
    "last_service_days": (0, 1000),
    "fault_history": (0, 100),
}


def fit_preprocessor(df: pd.DataFrame, config: dict) -> tuple:
    """Fit StandardScaler on all numeric features.

    Args:
        df: Training DataFrame containing all feature columns.
        config: Configuration dict (reserved for future params).

    Returns:
        Tuple of (fitted_pipeline, transformed_df).
    """
    X = df[NUMERIC_FEATURES].copy()

    pipeline = Pipeline(steps=[("scaler", StandardScaler())])
    transformed = pipeline.fit_transform(X)

    transformed_df = pd.DataFrame(transformed, columns=NUMERIC_FEATURES, index=df.index)
    return pipeline, transformed_df


def transform(pipeline: Pipeline, df: pd.DataFrame) -> pd.DataFrame:
    """Apply a fitted preprocessing pipeline to new data.

    Args:
        pipeline: A fitted sklearn Pipeline returned by fit_preprocessor.
        df: DataFrame to transform; must contain all required feature columns
            with values within expected ranges.

    Returns:
        Transformed DataFrame with scaled feature columns.

    Raises:
        ValueError: If a required feature column is missing.
        ValueError: If a feature value is outside the expected range.
    """
    # Check all required fields are present
    for field in NUMERIC_FEATURES:
        if field not in df.columns:
            raise ValueError(f"Missing required field: {field}")

    X = df[NUMERIC_FEATURES].copy()

    # Validate value ranges
    for field, (low, high) in FEATURE_RANGES.items():
        for val in X[field]:
            if val < low or val > high:
                raise ValueError(
                    f"Value {val} for field '{field}' is out of expected range [{low}, {high}]"
                )

    transformed = pipeline.transform(X)
    return pd.DataFrame(transformed, columns=NUMERIC_FEATURES, index=df.index)


def save_preprocessor(pipeline: Pipeline, path: str) -> None:
    """Serialize the fitted pipeline to a .joblib file.

    Args:
        pipeline: Fitted sklearn Pipeline to serialize.
        path: Destination file path.
    """
    joblib.dump(pipeline, path)


def load_preprocessor(path: str) -> Pipeline:
    """Deserialize a fitted pipeline from a .joblib file.

    Args:
        path: Path to the .joblib file produced by save_preprocessor.

    Returns:
        The deserialized fitted Pipeline.
    """
    return joblib.load(path)
