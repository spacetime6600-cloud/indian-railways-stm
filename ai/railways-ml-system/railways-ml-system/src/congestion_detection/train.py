"""Training pipeline for the Congestion Detection module.

Trains a RandomForest classifier and a KMeans clustering model,
evaluates the RF classifier, logs the cluster-to-label mapping,
and serializes both artifacts alongside the preprocessor.
"""

import os

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

from src.congestion_detection.preprocess import (
    ALL_FEATURES,
    TARGET_COLUMN,
    fit_preprocessor,
    save_preprocessor,
    transform,
)
from src.utils import load_config, setup_logger


def train(X_train: pd.DataFrame, y_train: pd.Series, config: dict) -> dict:
    """Fit a RandomForest classifier and a KMeans clustering model.

    Args:
        X_train: Feature DataFrame (already preprocessed).
        y_train: Target Series with congestion level labels.
        config: Configuration dict; uses config['random_seed'] and
                config['models']['congestion'] for hyperparameters.

    Returns:
        Dict with keys "random_forest" and "kmeans" mapping to fitted estimators.
    """
    logger = setup_logger(
        "congestion_train",
        {"logging": {"level": "INFO"}, "paths": {"logs": "logs/"}},
    )
    seed = config["random_seed"]
    cong_cfg = config["models"]["congestion"]

    # Fit RandomForest classifier
    rf = RandomForestClassifier(
        n_estimators=cong_cfg["rf_n_estimators"],
        random_state=seed,
    )
    rf.fit(X_train, y_train)
    logger.info("RandomForest classifier fitted with %d estimators", cong_cfg["rf_n_estimators"])

    # Fit KMeans (unsupervised)
    kmeans = KMeans(
        n_clusters=cong_cfg["kmeans_n_clusters"],
        random_state=seed,
    )
    kmeans.fit(X_train)
    logger.info("KMeans fitted with %d clusters", cong_cfg["kmeans_n_clusters"])

    # Log cluster-to-label mapping: for each cluster, find the most common label
    cluster_labels = kmeans.labels_
    y_array = np.array(y_train)
    cluster_to_label = {}
    for cluster_id in range(cong_cfg["kmeans_n_clusters"]):
        mask = cluster_labels == cluster_id
        if mask.sum() > 0:
            labels_in_cluster = y_array[mask]
            unique, counts = np.unique(labels_in_cluster, return_counts=True)
            most_common = unique[np.argmax(counts)]
            cluster_to_label[int(cluster_id)] = most_common
        else:
            cluster_to_label[int(cluster_id)] = None

    logger.info("Cluster-to-label mapping: %s", cluster_to_label)

    return {"random_forest": rf, "kmeans": kmeans}


def evaluate(models: dict, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    """Compute classification metrics for the RandomForest model and log results.

    Args:
        models: Dict with at least key "random_forest" mapping to a fitted classifier.
        X_test: Feature DataFrame (already preprocessed).
        y_test: True target labels.

    Returns:
        Dict with structure:
            {
                "random_forest": {
                    "accuracy": float,
                    "precision": float,
                    "recall": float,
                    "f1": float,
                }
            }
    """
    logger = setup_logger(
        "congestion_train",
        {"logging": {"level": "INFO"}, "paths": {"logs": "logs/"}},
    )

    rf = models["random_forest"]
    y_pred = rf.predict(X_test)

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
    }

    logger.info(
        "RandomForest — accuracy=%.4f  precision=%.4f  recall=%.4f  f1=%.4f",
        metrics["accuracy"],
        metrics["precision"],
        metrics["recall"],
        metrics["f1"],
    )

    return {"random_forest": metrics}


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
    logger = setup_logger("congestion_train", cfg)
    logger.info("Starting Congestion Detection training pipeline")

    # 2. Load / generate congestion data
    congestion_path = cfg["data"]["congestion"]
    if not os.path.exists(congestion_path):
        logger.info("Data file not found at %s — generating synthetic data", congestion_path)
        from src.data_generator import generate_congestion_data
        generate_congestion_data(cfg)

    logger.info("Loading data from %s", congestion_path)
    df = pd.read_csv(congestion_path)

    # 3. Train/test split
    test_size = cfg["models"]["congestion"].get("test_size", 0.2)
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=cfg["random_seed"],
        stratify=df[TARGET_COLUMN],
    )

    # 4. Fit preprocessor on training split
    logger.info("Fitting preprocessor on %d training samples", len(train_df))
    pipeline, X_train_transformed = fit_preprocessor(train_df, cfg)
    y_train = train_df[TARGET_COLUMN].reset_index(drop=True)

    # Transform test split
    X_test_transformed = transform(pipeline, test_df[ALL_FEATURES])
    y_test = test_df[TARGET_COLUMN].reset_index(drop=True)

    # 5. Train both models
    logger.info("Training RandomForest classifier and KMeans")
    models = train(X_train_transformed, y_train, cfg)

    # 6. Evaluate RF
    logger.info("Evaluating RandomForest on %d test samples", len(test_df))
    metrics = evaluate(models, X_test_transformed, y_test)
    logger.info("Evaluation complete: %s", metrics)

    # 7. Save RF model
    models_dir = cfg["paths"]["models"]
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, "congestion_detection_model.joblib")
    save_model(models["random_forest"], model_path)
    logger.info("RF model saved to %s", model_path)

    # 8. Save preprocessor
    preprocessor_path = os.path.join(models_dir, "congestion_detection_preprocessor.joblib")
    save_preprocessor(pipeline, preprocessor_path)
    logger.info("Preprocessor saved to %s", preprocessor_path)

    logger.info("Congestion Detection training pipeline complete")
