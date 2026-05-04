"""Training pipeline for the Predictive Maintenance module.

Trains a RandomForest regressor (risk_score) and a RandomForest classifier (status),
evaluates both, and serializes all artifacts alongside the preprocessor.
"""

import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
)
from sklearn.model_selection import train_test_split

from src.predictive_maintenance.preprocess import (
    NUMERIC_FEATURES,
    fit_preprocessor,
    save_preprocessor,
    transform,
)
from src.utils import load_config, setup_logger

TARGET_REG = "risk_score"
TARGET_CLF = "status"


def train(
    X_train: pd.DataFrame,
    y_train_reg: pd.Series,
    y_train_clf: pd.Series,
    config: dict,
) -> dict:
    """Fit RF regressor (risk_score) and RF classifier (status).

    Args:
        X_train: Feature DataFrame (already preprocessed).
        y_train_reg: Continuous target for regression (risk_score).
        y_train_clf: Categorical target for classification (status).
        config: Configuration dict; uses config['random_seed'] and
                config['models']['maintenance']['rf_n_estimators'].

    Returns:
        Dict with keys "regressor" and "classifier" mapping to fitted estimators.
    """
    seed = config["random_seed"]
    n_estimators = config["models"]["maintenance"]["rf_n_estimators"]

    rf_reg = RandomForestRegressor(n_estimators=n_estimators, random_state=seed)
    rf_reg.fit(X_train, y_train_reg)

    rf_clf = RandomForestClassifier(n_estimators=n_estimators, random_state=seed)
    rf_clf.fit(X_train, y_train_clf)

    return {"regressor": rf_reg, "classifier": rf_clf}


def evaluate(
    models: dict,
    X_test: pd.DataFrame,
    y_test_reg: pd.Series,
    y_test_clf: pd.Series,
) -> dict:
    """Compute regression and classification metrics and log the results.

    Args:
        models: Dict with keys "regressor" and "classifier".
        X_test: Feature DataFrame (already preprocessed).
        y_test_reg: True continuous targets for regression.
        y_test_clf: True categorical targets for classification.

    Returns:
        Dict with structure:
            {
                "regressor": {"rmse": float, "mae": float},
                "classifier": {"accuracy": float, "f1": float},
            }
    """
    logger = setup_logger(
        "maintenance_train",
        {"logging": {"level": "INFO"}, "paths": {"logs": "logs/"}},
    )

    # Regressor metrics
    y_pred_reg = models["regressor"].predict(X_test)
    rmse = float(np.sqrt(mean_squared_error(y_test_reg, y_pred_reg)))
    mae = float(mean_absolute_error(y_test_reg, y_pred_reg))
    logger.info("Regressor — RMSE=%.4f  MAE=%.4f", rmse, mae)

    # Classifier metrics
    y_pred_clf = models["classifier"].predict(X_test)
    accuracy = float(accuracy_score(y_test_clf, y_pred_clf))
    f1 = float(f1_score(y_test_clf, y_pred_clf, average="weighted", zero_division=0))
    logger.info("Classifier — accuracy=%.4f  f1=%.4f", accuracy, f1)

    return {
        "regressor": {"rmse": rmse, "mae": mae},
        "classifier": {"accuracy": accuracy, "f1": f1},
    }


def save_model(model, path: str) -> None:
    """Serialize a fitted model to a .joblib file.

    Args:
        model: Any fitted sklearn-compatible estimator.
        path: Destination file path.
    """
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    joblib.dump(model, path)


def train_lstm_stub(X: np.ndarray, config: dict) -> dict:
    """Placeholder for a future LSTM-based maintenance model.

    Args:
        X: Input feature array (used only to capture shape).
        config: Configuration dict (reserved for future LSTM hyperparameters).

    Returns:
        Placeholder dict: {"lstm": "stub", "input_shape": X.shape}.
    """
    return {"lstm": "stub", "input_shape": X.shape}


if __name__ == "__main__":
    # 1. Load config
    cfg = load_config("configs/config.yaml")
    logger = setup_logger("maintenance_train", cfg)
    logger.info("Starting Predictive Maintenance training pipeline")

    # 2. Load / generate maintenance data
    maintenance_path = cfg["data"]["maintenance"]
    if not os.path.exists(maintenance_path):
        logger.info("Data file not found at %s — generating synthetic data", maintenance_path)
        from src.data_generator import generate_maintenance_data
        generate_maintenance_data(cfg)

    logger.info("Loading data from %s", maintenance_path)
    df = pd.read_csv(maintenance_path)

    # 3. Train/test split
    test_size = cfg["models"]["maintenance"].get("test_size", 0.2)
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=cfg["random_seed"],
        stratify=df[TARGET_CLF],
    )

    # 4. Fit preprocessor on training split
    logger.info("Fitting preprocessor on %d training samples", len(train_df))
    pipeline, X_train_transformed = fit_preprocessor(train_df, cfg)
    y_train_reg = train_df[TARGET_REG].reset_index(drop=True)
    y_train_clf = train_df[TARGET_CLF].reset_index(drop=True)

    # Transform test split
    X_test_transformed = transform(pipeline, test_df[NUMERIC_FEATURES])
    y_test_reg = test_df[TARGET_REG].reset_index(drop=True)
    y_test_clf = test_df[TARGET_CLF].reset_index(drop=True)

    # 5. Train both models
    logger.info("Training RF regressor and RF classifier")
    models = train(X_train_transformed, y_train_reg, y_train_clf, cfg)

    # 6. Evaluate
    logger.info("Evaluating models on %d test samples", len(test_df))
    metrics = evaluate(models, X_test_transformed, y_test_reg, y_test_clf)
    logger.info("Evaluation complete: %s", metrics)

    # 7–9. Save artifacts
    models_dir = cfg["paths"]["models"]
    os.makedirs(models_dir, exist_ok=True)

    regressor_path = os.path.join(models_dir, "maintenance_regressor.joblib")
    classifier_path = os.path.join(models_dir, "maintenance_classifier.joblib")
    preprocessor_path = os.path.join(models_dir, "maintenance_preprocessor.joblib")

    save_model(models["regressor"], regressor_path)
    logger.info("Regressor saved to %s", regressor_path)

    save_model(models["classifier"], classifier_path)
    logger.info("Classifier saved to %s", classifier_path)

    save_preprocessor(pipeline, preprocessor_path)
    logger.info("Preprocessor saved to %s", preprocessor_path)

    logger.info("Predictive Maintenance training pipeline complete")
