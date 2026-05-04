"""Preprocessing pipeline for the Delay Prediction module.

Encodes categorical features (weather, congestion_level, train_type) with
OrdinalEncoder and scales numeric features (distance, previous_delay) with
StandardScaler inside a single sklearn ColumnTransformer + Pipeline.
"""

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler

CATEGORICAL_FEATURES = ["weather", "congestion_level", "train_type"]
NUMERIC_FEATURES = ["distance", "previous_delay"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES  # numeric first for ColumnTransformer output order
TARGET_COLUMN = "delay_minutes"

WEATHER_CATEGORIES = ["clear", "rain", "fog", "storm"]
CONGESTION_CATEGORIES = ["Low", "Medium", "High"]
TRAIN_TYPE_CATEGORIES = ["express", "passenger", "freight"]

CATEGORY_MAP = {
    "weather": WEATHER_CATEGORIES,
    "congestion_level": CONGESTION_CATEGORIES,
    "train_type": TRAIN_TYPE_CATEGORIES,
}


def fit_preprocessor(df: pd.DataFrame, config: dict) -> tuple:
    """Fit encoders and scalers on training data.

    Args:
        df: Training DataFrame containing all feature columns and the target column.
        config: Configuration dict (reserved for future params).

    Returns:
        Tuple of (fitted_pipeline, transformed_df) where transformed_df contains
        the scaled/encoded feature columns (target column excluded).
    """
    X = df[ALL_FEATURES].copy()

    numeric_transformer = Pipeline(steps=[
        ("scaler", StandardScaler()),
    ])
    categorical_transformer = Pipeline(steps=[
        ("ordinal", OrdinalEncoder(
            categories=[WEATHER_CATEGORIES, CONGESTION_CATEGORIES, TRAIN_TYPE_CATEGORIES],
            handle_unknown="error",
        )),
    ])

    preprocessor = ColumnTransformer(transformers=[
        ("num", numeric_transformer, NUMERIC_FEATURES),
        ("cat", categorical_transformer, CATEGORICAL_FEATURES),
    ])

    pipeline = Pipeline(steps=[("preprocessor", preprocessor)])
    transformed = pipeline.fit_transform(X)

    out_columns = NUMERIC_FEATURES + CATEGORICAL_FEATURES
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
    for field in ALL_FEATURES:
        if field not in df.columns:
            raise ValueError(f"Missing required field: {field}")

    X = df[ALL_FEATURES].copy()

    # Validate categorical values before transforming
    ordinal_enc: OrdinalEncoder = (
        pipeline.named_steps["preprocessor"]
        .named_transformers_["cat"]
        .named_steps["ordinal"]
    )

    for i, col in enumerate(CATEGORICAL_FEATURES):
        known_categories = set(ordinal_enc.categories_[i])
        for val in X[col]:
            if val not in known_categories:
                raise ValueError(f"Unexpected value '{val}' for field '{col}'")

    try:
        transformed = pipeline.transform(X)
    except ValueError as exc:
        msg = str(exc)
        for col in CATEGORICAL_FEATURES:
            if col in msg:
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

    out_columns = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    return pd.DataFrame(transformed, columns=out_columns, index=df.index)


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
