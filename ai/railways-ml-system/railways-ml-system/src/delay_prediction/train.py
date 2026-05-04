"""Training pipeline for the Delay Prediction module.

Trains a LinearRegression and an XGBoost regressor, evaluates both on RMSE + MAE,
selects the best by lower RMSE, and serializes the winning model alongside the
preprocessor.
"""

import os

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from src.delay_prediction.preprocess import (
    ALL_FEATURES,
    TARGET_COLUMN,
    fit_preprocessor,
    save_preprocessor,
    transform,
)
from src.utils import load_config, setup_logger


def train(X_train: pd.DataFrame, y_train: pd.Series, config: dict) -> dict:
    """Fit LinearRegression and XGBoost regressor on training data.

    Args:
        X_train: Feature DataFrame (already preprocessed).
        y_train: Continuous target (delay_minutes).
        config: Configuration dict; uses config['random_seed'] and
                config['models']['delay']['xgb_n_estimators'].

    Returns:
        Dict with keys "linear_regression" and "xgboost" mapping to fitted estimators.
    """
    seed = config["random_seed"]
    xgb_n_estimators = config["models"]["delay"]["xgb_n_estimators"]

    lr = LinearRegression()
    lr.fit(X_train, y_train)

    xgb = XGBRegressor(n_estimators=xgb_n_estimators, random_state=seed)
    xgb.fit(X_train, y_train)

    return {"linear_regression": lr, "xgboost": xgb}


def evaluate(models: dict, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    """Compute RMSE and MAE per model, log results, and select best by lower RMSE.

    Args:
        models: Dict with keys "linear_regression" and "xgboost".
        X_test: Feature DataFrame (already preprocessed).
        y_test: True continuous targets.

    Returns:
        Dict with structure:
            {
                "linear_regression": {"rmse": float, "mae": float},
                "xgboost": {"rmse": float, "mae": float},
            }
    """
    logger = setup_logger(
        "delay_train",
        {"logging": {"level": "INFO"}, "paths": {"logs": "logs/"}},
    )

    results = {}
    for name, model in models.items():
        y_pred = model.predict(X_test)
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        mae = float(mean_absolute_error(y_test, y_pred))
        results[name] = {"rmse": rmse, "mae": mae}
        logger.info("%s — RMSE=%.4f  MAE=%.4f", name, rmse, mae)

    best = min(results, key=lambda k: results[k]["rmse"])
    logger.info("Best model by RMSE: %s (RMSE=%.4f)", best, results[best]["rmse"])

    return results


def save_model(model, path: str) -> None:
    """Serialize a fitted model to a .joblib file.

    Args:
        model: Any fitted sklearn-compatible estimator.
        path: Destination file path.
    """
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    joblib.dump(model, path)


if __name__ == "__main__":
    # 1. Load config
    cfg = load_config("configs/config.yaml")
    logger = setup_logger("delay_train", cfg)
    logger.info("Starting Delay Prediction training pipeline")

    # 2. Load / generate delay data
    delay_path = cfg["data"]["delay"]
    if not os.path.exists(delay_path):
        logger.info("Data file not found at %s — generating synthetic data", delay_path)
        from src.data_generator import generate_delay_data
        generate_delay_data(cfg)

    logger.info("Loading data from %s", delay_path)
    df = pd.read_csv(delay_path)

    # 3. Train/test split
    test_size = cfg["models"]["delay"].get("test_size", 0.2)
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=cfg["random_seed"],
    )

    # 4. Fit preprocessor on training split
    logger.info("Fitting preprocessor on %d training samples", len(train_df))
    pipeline, X_train_transformed = fit_preprocessor(train_df, cfg)
    y_train = train_df[TARGET_COLUMN].reset_index(drop=True)

    # Transform test split
    X_test_transformed = transform(pipeline, test_df[ALL_FEATURES])
    y_test = test_df[TARGET_COLUMN].reset_index(drop=True)

    # 5. Train both models
    logger.info("Training LinearRegression and XGBoost regressor")
    models = train(X_train_transformed, y_train, cfg)

    # 6. Evaluate both models
    logger.info("Evaluating models on %d test samples", len(test_df))
    metrics = evaluate(models, X_test_transformed, y_test)
    logger.info("Evaluation complete: %s", metrics)

    # 7. Select best model by lower RMSE
    best_name = min(metrics, key=lambda k: metrics[k]["rmse"])
    best_model = models[best_name]
    logger.info("Selected best model: %s", best_name)

    # 8. Save best model and preprocessor
    models_dir = cfg["paths"]["models"]
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, "delay_prediction_model.joblib")
    preprocessor_path = os.path.join(models_dir, "delay_prediction_preprocessor.joblib")

    save_model(best_model, model_path)
    logger.info("Best model saved to %s", model_path)

    # 9. Save preprocessor
    save_preprocessor(pipeline, preprocessor_path)
    logger.info("Preprocessor saved to %s", preprocessor_path)

    logger.info("Delay Prediction training pipeline complete")
