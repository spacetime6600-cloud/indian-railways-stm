"""Lite XAI helpers — confidence scores and top feature contributions.

Works with sklearn RandomForest (predict_proba) and XGBoost dict wrappers.
Falls back gracefully when feature importances are unavailable.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def get_confidence_and_explanation(
    model,
    transformed_df: pd.DataFrame,
    feature_names: list[str],
    top_n: int = 3,
) -> dict:
    """Return confidence score and top contributing features.

    Args:
        model: Fitted classifier/regressor or XGBoost dict wrapper.
        transformed_df: Single-row preprocessed DataFrame.
        feature_names: Ordered list of feature names matching transformed columns.
        top_n: Number of top features to include in explanation.

    Returns:
        Dict with keys:
            "confidence": float in [0, 1] — max class probability (classifiers)
                          or None for regressors without predict_proba.
            "top_features": list of {"feature": str, "importance": float} dicts,
                            sorted descending by importance.
    """
    # Resolve underlying sklearn model for XGBoost dict wrapper
    underlying = model.get("xgb_model", model) if isinstance(model, dict) else model

    # --- Confidence (predict_proba) ---
    confidence = None
    if hasattr(underlying, "predict_proba"):
        try:
            proba = underlying.predict_proba(transformed_df)
            confidence = float(np.max(proba))
        except Exception:
            pass

    # --- Feature importances ---
    top_features: list[dict] = []
    importances = None
    if hasattr(underlying, "feature_importances_"):
        importances = underlying.feature_importances_

    if importances is not None and len(importances) == len(feature_names):
        idx = np.argsort(importances)[::-1][:top_n]
        top_features = [
            {"feature": feature_names[int(i)], "importance": round(float(importances[i]), 4)}
            for i in idx
        ]

    return {"confidence": confidence, "top_features": top_features}
