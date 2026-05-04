"""Training pipeline for the Alert Prioritization module.

Trains RandomForest and XGBoost classifiers, evaluates them, selects the best
by weighted F1, and serializes the winner alongside its preprocessor.
"""

import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from src.alert_prioritization.preprocess import (
    ALL_FEATURES,
    TARGET_COLUMN,
    fit_preprocessor,
    save_preprocessor,
)
from src.utils import load_config, setup_logger


class XGBLabelWrapper:
    """Wraps an XGBClassifier to accept and return string labels.

    Stored as a (model, label_encoder) tuple in joblib to avoid pickle issues
    when the class is defined in __main__. Use save_model/load_model which
    handle this transparently.
    """

    def __init__(self, model, label_encoder):
        self._model = model
        self._le = label_encoder

    def predict(self, X):
        return self._le.inverse_transform(self._model.predict(X))

    def __getattr__(self, name):
        return getattr(self._model, name)

    def __getstate__(self):
        return {"_model": self._model, "_le": self._le}

    def __setstate__(self, state):
        self._model = state["_model"]
        self._le = state["_le"]


def train(X_train: pd.DataFrame, y_train: pd.Series, config: dict) -> dict:
    """Fit RandomForest and XGBoost classifiers on the training data.

    Args:
        X_train: Feature DataFrame (already preprocessed).
        y_train: Target Series with priority labels.
        config: Configuration dict; uses config['random_seed'] and
                config['models']['alert'] for hyperparameters.

    Returns:
        Dict with keys "random_forest" and "xgboost" mapping to fitted estimators.
    """
    seed = config["random_seed"]
    alert_cfg = config["models"]["alert"]

    rf = RandomForestClassifier(
        n_estimators=alert_cfg["rf_n_estimators"],
        random_state=seed,
    )
    rf.fit(X_train, y_train)

    # XGBoost requires integer labels; encode string labels to ints
    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder()
    y_train_enc = le.fit_transform(y_train)

    xgb_base = XGBClassifier(
        n_estimators=alert_cfg["xgb_n_estimators"],
        random_state=seed,
        eval_metric="mlogloss",
    )
    xgb_base.fit(X_train, y_train_enc)

    # Store as a plain dict so joblib can pickle it without class lookup issues
    xgb = {"xgb_model": xgb_base, "label_encoder": le}

    return {"random_forest": rf, "xgboost": xgb}


def evaluate(models: dict, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    """Compute classification metrics for each model and log the results.

    Args:
        models: Dict of {model_name: fitted_estimator}.
        X_test: Feature DataFrame (already preprocessed).
        y_test: True target labels.

    Returns:
        Dict of {model_name: {"accuracy": float, "precision": float,
                              "recall": float, "f1": float}}.
    """
    logger = setup_logger("alert_train", {"logging": {"level": "INFO"}, "paths": {"logs": "logs/"}})
    results = {}

    for name, model in models.items():
        # Handle XGBoost stored as {"xgb_model": ..., "label_encoder": ...}
        if isinstance(model, dict) and "xgb_model" in model:
            y_pred = model["label_encoder"].inverse_transform(model["xgb_model"].predict(X_test))
        else:
            y_pred = model.predict(X_test)
        metrics = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
            "f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
        }
        results[name] = metrics
        logger.info(
            "%s — accuracy=%.4f  precision=%.4f  recall=%.4f  f1=%.4f",
            name,
            metrics["accuracy"],
            metrics["precision"],
            metrics["recall"],
            metrics["f1"],
        )

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
    logger = setup_logger("alert_train", cfg)
    logger.info("Starting Alert Prioritization training pipeline")

    # 2. Load data (generate if not exists)
    alert_path = cfg["data"]["alert"]
    if not os.path.exists(alert_path):
        logger.info("Data file not found at %s — generating synthetic data", alert_path)
        from src.data_generator import generate_alert_data
        generate_alert_data(cfg)

    logger.info("Loading data from %s", alert_path)
    df = pd.read_csv(alert_path)

    # 3. Train/test split
    test_size = cfg["models"]["alert"].get("test_size", 0.2)
    train_df, test_df = train_test_split(
        df, test_size=test_size, random_state=cfg["random_seed"], stratify=df[TARGET_COLUMN]
    )

    # 4. Fit preprocessor on training split
    logger.info("Fitting preprocessor on %d training samples", len(train_df))
    pipeline, X_train_transformed = fit_preprocessor(train_df, cfg)
    y_train = train_df[TARGET_COLUMN].reset_index(drop=True)

    # Transform test split
    from src.alert_prioritization.preprocess import transform
    X_test_transformed = transform(pipeline, test_df[ALL_FEATURES])
    y_test = test_df[TARGET_COLUMN].reset_index(drop=True)

    # 5. Train both models
    logger.info("Training RandomForest and XGBoost classifiers")
    models = train(X_train_transformed, y_train, cfg)

    # 6. Evaluate both models
    logger.info("Evaluating models on %d test samples", len(test_df))
    metrics = evaluate(models, X_test_transformed, y_test)

    # 7. Select best model by weighted F1
    best_name = max(metrics, key=lambda k: metrics[k]["f1"])
    best_model = models[best_name]
    logger.info(
        "Best model: %s (F1=%.4f)", best_name, metrics[best_name]["f1"]
    )

    # 8. Save best model and preprocessor
    models_dir = cfg["paths"]["models"]
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, "alert_prioritization_model.joblib")
    preprocessor_path = os.path.join(models_dir, "alert_prioritization_preprocessor.joblib")

    save_model(best_model, model_path)
    logger.info("Best model saved to %s", model_path)

    save_preprocessor(pipeline, preprocessor_path)
    logger.info("Preprocessor saved to %s", preprocessor_path)

    logger.info("Alert Prioritization training pipeline complete")
