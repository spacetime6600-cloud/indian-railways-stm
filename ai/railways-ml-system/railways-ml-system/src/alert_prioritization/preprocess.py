"""Preprocessing pipeline for the Alert Prioritization module.

Encodes the categorical `alert_type` feature with OrdinalEncoder and
scales numeric features with StandardScaler inside a single sklearn Pipeline.
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler

CATEGORICAL_FEATURES = ["alert_type"]
NUMERIC_FEATURES = ["delay_impact", "safety_risk", "affected_trains", "route_busy", "peak_hour"]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET_COLUMN = "priority"


def fit_preprocessor(df: pd.DataFrame, config: dict) -> tuple:
    """Fit encoders and scalers on training data.

    Args:
        df: Training DataFrame containing all feature columns and the target column.
        config: Configuration dict (unused directly, reserved for future params).

    Returns:
        Tuple of (fitted_pipeline, transformed_df) where transformed_df contains
        the scaled/encoded feature columns (target column excluded).
    """
    X = df[ALL_FEATURES].copy()

    categorical_transformer = Pipeline(steps=[
        ("ordinal", OrdinalEncoder(handle_unknown="error")),
    ])
    numeric_transformer = Pipeline(steps=[
        ("scaler", StandardScaler()),
    ])

    preprocessor = ColumnTransformer(transformers=[
        ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ("num", numeric_transformer, NUMERIC_FEATURES),
    ])

    pipeline = Pipeline(steps=[("preprocessor", preprocessor)])
    transformed = pipeline.fit_transform(X)

    # Reconstruct a DataFrame with proper column ordering: cat cols first, then numeric
    out_columns = CATEGORICAL_FEATURES + NUMERIC_FEATURES
    transformed_df = pd.DataFrame(transformed, columns=out_columns, index=df.index)

    return pipeline, transformed_df


def transform(pipeline: Pipeline, df: pd.DataFrame) -> pd.DataFrame:
    """Apply a fitted preprocessing pipeline to new data.

    Args:
        pipeline: A fitted sklearn Pipeline returned by fit_preprocessor.
        df: DataFrame to transform; must contain all required feature columns.

    Returns:
        Transformed DataFrame with encoded/scaled feature columns.

    Raises:
        ValueError: If a required feature column is missing.
        ValueError: If an unknown categorical value is encountered.
    """
    # Check all required fields are present
    for field in ALL_FEATURES:
        if field not in df.columns:
            raise ValueError(f"Missing required field: {field}")

    X = df[ALL_FEATURES].copy()

    # Check for unknown categorical values before transforming
    ordinal_enc: OrdinalEncoder = pipeline.named_steps["preprocessor"] \
        .named_transformers_["cat"] \
        .named_steps["ordinal"]

    for i, col in enumerate(CATEGORICAL_FEATURES):
        known_categories = set(ordinal_enc.categories_[i])
        for val in X[col]:
            if val not in known_categories:
                raise ValueError(f"Unexpected value '{val}' for field '{col}'")

    try:
        transformed = pipeline.transform(X)
    except ValueError as exc:
        # Re-raise sklearn unknown-category errors with the required message format
        msg = str(exc)
        # Try to extract field and value from sklearn's error message
        for col in CATEGORICAL_FEATURES:
            if col in msg:
                # Find the offending value from the data
                known_categories = set(
                    pipeline.named_steps["preprocessor"]
                    .named_transformers_["cat"]
                    .named_steps["ordinal"]
                    .categories_[CATEGORICAL_FEATURES.index(col)]
                )
                for val in X[col]:
                    if val not in known_categories:
                        raise ValueError(f"Unexpected value '{val}' for field '{col}'") from exc
        raise

    out_columns = CATEGORICAL_FEATURES + NUMERIC_FEATURES
    return pd.DataFrame(transformed, columns=out_columns, index=df.index)


def save_preprocessor(pipeline: Pipeline, path: str) -> None:
    """Serialize the fitted pipeline to a .joblib file.

    Args:
        pipeline: Fitted sklearn Pipeline to serialize.
        path: Destination file path (e.g. "models/alert_prioritization_preprocessor.joblib").
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
