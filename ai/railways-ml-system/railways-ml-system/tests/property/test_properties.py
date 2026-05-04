"""Property-based tests for the Railways ML System.

Each test is tagged with the feature and property number for traceability.
"""

import pytest

from src.data_generator import (
    generate_alert_data,
    generate_congestion_data,
    generate_maintenance_data,
)
from src.utils import load_config

CONFIG_PATH = "configs/config.yaml"


# Feature: railways-ml-system, Property 9: Class balance in generated datasets
# Validates: Requirements 1.3
def test_class_balance_in_generated_datasets():
    """Property 9: No single label exceeds 60% of rows in any classification dataset."""
    config = load_config(CONFIG_PATH)

    alert_df = generate_alert_data(config)
    alert_max_freq = alert_df["priority"].value_counts(normalize=True).max()
    assert alert_max_freq <= 0.60, (
        f"Alert dataset: label '{alert_df['priority'].value_counts(normalize=True).idxmax()}' "
        f"exceeds 60% (got {alert_max_freq:.2%})"
    )

    maintenance_df = generate_maintenance_data(config)
    maintenance_max_freq = maintenance_df["status"].value_counts(normalize=True).max()
    assert maintenance_max_freq <= 0.60, (
        f"Maintenance dataset: label '{maintenance_df['status'].value_counts(normalize=True).idxmax()}' "
        f"exceeds 60% (got {maintenance_max_freq:.2%})"
    )

    congestion_df = generate_congestion_data(config)
    congestion_max_freq = congestion_df["congestion_level"].value_counts(normalize=True).max()
    assert congestion_max_freq <= 0.60, (
        f"Congestion dataset: label '{congestion_df['congestion_level'].value_counts(normalize=True).idxmax()}' "
        f"exceeds 60% (got {congestion_max_freq:.2%})"
    )


# ---------------------------------------------------------------------------
# Property 1: Alert priority label validity
# Feature: railways-ml-system, Property 1: Alert priority label validity
# Validates: Requirements 2.2
# ---------------------------------------------------------------------------
import os
import numpy as np
import numpy.testing
import pandas as pd
import tempfile

from hypothesis import given, settings, assume
from hypothesis import strategies as st

from src.alert_prioritization.preprocess import (
    ALL_FEATURES,
    fit_preprocessor,
    load_preprocessor,
    save_preprocessor,
    transform,
)


VALID_ALERT_TYPES = ["signal_failure", "track_fault", "engine_issue", "weather_alert", "passenger_emergency"]
VALID_PRIORITIES = {"Critical", "High", "Medium", "Low"}

alert_strategy = st.fixed_dictionaries({
    "alert_type": st.sampled_from(VALID_ALERT_TYPES),
    "delay_impact": st.floats(min_value=0, max_value=120),
    "safety_risk": st.floats(min_value=0.0, max_value=1.0),
    "affected_trains": st.integers(min_value=1, max_value=20),
    "route_busy": st.integers(min_value=0, max_value=1),
    "peak_hour": st.integers(min_value=0, max_value=1),
})


@settings(max_examples=100)
@given(alert_strategy)
def test_alert_priority_label_validity(input_data):
    """Property 1: Alert priority label validity.

    For any valid alert input, the model must return a label in
    {"Critical", "High", "Medium", "Low"}.
    """
    model_path = "models/alert_prioritization_model.joblib"
    preprocessor_path = "models/alert_prioritization_preprocessor.joblib"

    if not os.path.exists(model_path) or not os.path.exists(preprocessor_path):
        pytest.skip("Pre-trained alert model artifacts not found — run training first")

    from src.alert_prioritization.predict import load_model, predict

    model = load_model(model_path)
    preprocessor = load_preprocessor(preprocessor_path)

    result = predict(model, preprocessor, input_data)

    assert "priority" in result, "Response must contain 'priority' key"
    assert result["priority"] in VALID_PRIORITIES, (
        f"Expected priority in {VALID_PRIORITIES}, got '{result['priority']}'"
    )


# ---------------------------------------------------------------------------
# Property 6: Preprocessing round-trip consistency (alert)
# Feature: railways-ml-system, Property 6: Preprocessing round-trip consistency
# Validates: Requirements 2.6, 6.1, 6.4
# ---------------------------------------------------------------------------

def _make_alert_df(records):
    """Convert a list of alert dicts to a DataFrame with a dummy priority column."""
    df = pd.DataFrame(records)
    df["priority"] = "Low"  # dummy target for fit_preprocessor
    return df


@settings(max_examples=100)
@given(st.lists(alert_strategy, min_size=5, max_size=20))
def test_preprocessing_round_trip_consistency_alert(records):
    """Property 6: Preprocessing round-trip consistency.

    load_preprocessor(path).transform(x) must produce the same values as
    the in-memory fitted pipeline for any valid alert input.
    """
    config = load_config(CONFIG_PATH)

    train_df = _make_alert_df(records)
    fitted_pipeline, _ = fit_preprocessor(train_df, config)

    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        save_preprocessor(fitted_pipeline, tmp_path)
        loaded_pipeline = load_preprocessor(tmp_path)

        sample_df = train_df[ALL_FEATURES].copy()
        result_fitted = transform(fitted_pipeline, sample_df)
        result_loaded = transform(loaded_pipeline, sample_df)

        numpy.testing.assert_array_almost_equal(
            result_fitted.values,
            result_loaded.values,
            decimal=6,
            err_msg="Round-trip preprocessor produced different values",
        )
    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Property 7: Preprocessing error on unexpected feature values (alert)
# Feature: railways-ml-system, Property 7: Preprocessing error on unexpected feature values
# Validates: Requirements 2.7, 6.5
# ---------------------------------------------------------------------------

UNKNOWN_ALERT_TYPES = ["unknown_type", "invalid_alert", "foo", "bar", "SIGNAL_FAILURE", ""]

unknown_alert_type_strategy = st.fixed_dictionaries({
    "alert_type": st.sampled_from(UNKNOWN_ALERT_TYPES),
    "delay_impact": st.floats(min_value=0, max_value=120),
    "safety_risk": st.floats(min_value=0.0, max_value=1.0),
    "affected_trains": st.integers(min_value=1, max_value=20),
    "route_busy": st.integers(min_value=0, max_value=1),
    "peak_hour": st.integers(min_value=0, max_value=1),
})

missing_field_strategy = st.fixed_dictionaries({
    "alert_type": st.sampled_from(VALID_ALERT_TYPES),
    "delay_impact": st.floats(min_value=0, max_value=120),
    "safety_risk": st.floats(min_value=0.0, max_value=1.0),
    "affected_trains": st.integers(min_value=1, max_value=20),
    "route_busy": st.integers(min_value=0, max_value=1),
    # peak_hour intentionally omitted
})


@settings(max_examples=100)
@given(st.one_of(unknown_alert_type_strategy, missing_field_strategy))
def test_preprocessing_error_on_unexpected_feature_values_alert(input_data):
    """Property 7: Preprocessing error on unexpected feature values.

    Inputs with missing fields or unknown alert_type values must raise a
    ValueError whose message contains the offending field name.
    """
    config = load_config(CONFIG_PATH)

    # Build a minimal training set with all valid known categories
    train_records = [
        {
            "alert_type": at,
            "delay_impact": 10.0,
            "safety_risk": 0.5,
            "affected_trains": 3,
            "route_busy": 1,
            "peak_hour": 0,
            "priority": "Low",
        }
        for at in VALID_ALERT_TYPES
    ]
    train_df = pd.DataFrame(train_records)
    fitted_pipeline, _ = fit_preprocessor(train_df, config)

    input_df = pd.DataFrame([input_data])

    with pytest.raises(ValueError) as exc_info:
        transform(fitted_pipeline, input_df)

    error_message = str(exc_info.value)
    # The error must name the offending field
    offending_fields = [f for f in ALL_FEATURES if f not in input_data]
    if offending_fields:
        # Missing field case
        assert any(field in error_message for field in offending_fields), (
            f"ValueError message '{error_message}' does not mention any missing field {offending_fields}"
        )
    else:
        # Unknown categorical value case
        assert "alert_type" in error_message, (
            f"ValueError message '{error_message}' does not mention 'alert_type'"
        )


# ---------------------------------------------------------------------------
# Property 3: Maintenance status label validity
# Feature: railways-ml-system, Property 3: Maintenance status label validity
# Validates: Requirements 3.3
# ---------------------------------------------------------------------------

VALID_MAINTENANCE_STATUSES = {"Healthy", "Warning", "Critical"}

maintenance_strategy = st.fixed_dictionaries({
    "temperature": st.floats(min_value=20, max_value=150),
    "vibration": st.floats(min_value=0, max_value=20),
    "usage_hours": st.floats(min_value=0, max_value=50000),
    "last_service_days": st.integers(min_value=0, max_value=365),
    "fault_history": st.integers(min_value=0, max_value=15),
})


@settings(max_examples=100)
@given(maintenance_strategy)
def test_maintenance_status_label_validity(input_data):
    """Property 3: Maintenance status label validity.

    For any valid maintenance input, the model must return a status label in
    {"Healthy", "Warning", "Critical"}.
    """
    regressor_path = "models/maintenance_regressor.joblib"
    classifier_path = "models/maintenance_classifier.joblib"
    preprocessor_path = "models/maintenance_preprocessor.joblib"

    if not (
        os.path.exists(regressor_path)
        and os.path.exists(classifier_path)
        and os.path.exists(preprocessor_path)
    ):
        pytest.skip("Pre-trained maintenance model artifacts not found — run training first")

    from src.predictive_maintenance.predict import load_model, predict
    from src.predictive_maintenance.preprocess import load_preprocessor as load_maint_preprocessor

    regressor = load_model(regressor_path)
    classifier = load_model(classifier_path)
    preprocessor = load_maint_preprocessor(preprocessor_path)

    result = predict(regressor, classifier, preprocessor, input_data)

    assert "status" in result, "Response must contain 'status' key"
    assert result["status"] in VALID_MAINTENANCE_STATUSES, (
        f"Expected status in {VALID_MAINTENANCE_STATUSES}, got '{result['status']}'"
    )


# ---------------------------------------------------------------------------
# Property 4: Risk score range invariant
# Feature: railways-ml-system, Property 4: Risk score range invariant
# Validates: Requirements 3.2
# ---------------------------------------------------------------------------


@settings(max_examples=100)
@given(maintenance_strategy)
def test_risk_score_range_invariant(input_data):
    """Property 4: Risk score range invariant.

    For any valid maintenance input, the model must return a risk_score in
    the range [0.0, 100.0].
    """
    regressor_path = "models/maintenance_regressor.joblib"
    classifier_path = "models/maintenance_classifier.joblib"
    preprocessor_path = "models/maintenance_preprocessor.joblib"

    if not (
        os.path.exists(regressor_path)
        and os.path.exists(classifier_path)
        and os.path.exists(preprocessor_path)
    ):
        pytest.skip("Pre-trained maintenance model artifacts not found — run training first")

    from src.predictive_maintenance.predict import load_model, predict
    from src.predictive_maintenance.preprocess import load_preprocessor as load_maint_preprocessor

    regressor = load_model(regressor_path)
    classifier = load_model(classifier_path)
    preprocessor = load_maint_preprocessor(preprocessor_path)

    result = predict(regressor, classifier, preprocessor, input_data)

    assert "risk_score" in result, "Response must contain 'risk_score' key"
    assert 0.0 <= result["risk_score"] <= 100.0, (
        f"Expected risk_score in [0.0, 100.0], got {result['risk_score']}"
    )


# ---------------------------------------------------------------------------
# Property 5: Delay non-negativity invariant
# Feature: railways-ml-system, Property 5: Delay non-negativity invariant
# Validates: Requirements 4.2
# ---------------------------------------------------------------------------

delay_strategy = st.fixed_dictionaries({
    "distance": st.floats(min_value=10, max_value=2000),
    "weather": st.sampled_from(["clear", "rain", "fog", "storm"]),
    "congestion_level": st.sampled_from(["Low", "Medium", "High"]),
    "previous_delay": st.floats(min_value=0, max_value=120),
    "train_type": st.sampled_from(["express", "passenger", "freight"]),
})


@settings(max_examples=100)
@given(delay_strategy)
def test_delay_non_negativity_invariant(input_data):
    """Property 5: Delay non-negativity invariant.

    For any valid delay prediction input, the predicted delay_minutes must
    satisfy delay_minutes >= 0.0.

    **Validates: Requirements 4.2**
    """
    model_path = "models/delay_prediction_model.joblib"
    preprocessor_path = "models/delay_prediction_preprocessor.joblib"

    if not os.path.exists(model_path) or not os.path.exists(preprocessor_path):
        pytest.skip("Pre-trained delay model artifacts not found — run training first")

    from src.delay_prediction.predict import load_model, predict
    from src.delay_prediction.preprocess import load_preprocessor as load_delay_preprocessor

    model = load_model(model_path)
    preprocessor = load_delay_preprocessor(preprocessor_path)

    result = predict(model, preprocessor, input_data)

    assert "delay_minutes" in result, "Response must contain 'delay_minutes' key"
    assert result["delay_minutes"] >= 0.0, (
        f"Expected delay_minutes >= 0.0, got {result['delay_minutes']}"
    )


# ---------------------------------------------------------------------------
# Property 6: Preprocessing round-trip consistency (delay)
# Feature: railways-ml-system, Property 6: Preprocessing round-trip consistency (delay)
# Validates: Requirements 4.6, 6.1, 6.4
# ---------------------------------------------------------------------------

from src.delay_prediction.preprocess import (
    ALL_FEATURES as DELAY_ALL_FEATURES,
    fit_preprocessor as delay_fit_preprocessor,
    load_preprocessor as delay_load_preprocessor,
    save_preprocessor as delay_save_preprocessor,
    transform as delay_transform,
)


def _make_delay_df(records):
    """Convert a list of delay dicts to a DataFrame with a dummy target column."""
    df = pd.DataFrame(records)
    df["delay_minutes"] = 0.0  # dummy target for fit_preprocessor
    return df


@settings(max_examples=100)
@given(st.lists(delay_strategy, min_size=5, max_size=20))
def test_preprocessing_round_trip_consistency_delay(records):
    """Property 6: Preprocessing round-trip consistency (delay).

    load_preprocessor(path).transform(x) must produce the same values as
    the in-memory fitted pipeline for any valid delay input.

    **Validates: Requirements 4.6, 6.1, 6.4**
    """
    config = load_config(CONFIG_PATH)

    train_df = _make_delay_df(records)
    fitted_pipeline, _ = delay_fit_preprocessor(train_df, config)

    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        delay_save_preprocessor(fitted_pipeline, tmp_path)
        loaded_pipeline = delay_load_preprocessor(tmp_path)

        sample_df = train_df[DELAY_ALL_FEATURES].copy()
        result_fitted = delay_transform(fitted_pipeline, sample_df)
        result_loaded = delay_transform(loaded_pipeline, sample_df)

        numpy.testing.assert_array_almost_equal(
            result_fitted.values,
            result_loaded.values,
            decimal=6,
            err_msg="Round-trip delay preprocessor produced different values",
        )
    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Property 2: Congestion level label validity
# Feature: railways-ml-system, Property 2: Congestion level label validity
# Validates: Requirements 5.2
# ---------------------------------------------------------------------------

from src.congestion_detection.preprocess import load_preprocessor as load_cong_preprocessor

VALID_CONGESTION_LEVELS = {"Low", "Medium", "High"}

congestion_strategy = st.fixed_dictionaries({
    "train_density": st.floats(min_value=1, max_value=50),
    "station_load": st.floats(min_value=100, max_value=5000),
    "time_of_day": st.sampled_from(["morning", "afternoon", "evening", "night"]),
    "route_type": st.sampled_from(["urban", "suburban", "intercity"]),
})


@settings(max_examples=100)
@given(congestion_strategy)
def test_congestion_level_label_validity(input_data):
    """Property 2: Congestion level label validity.

    For any valid congestion input, the model must return a label in
    {"Low", "Medium", "High"}.
    """
    model_path = "models/congestion_detection_model.joblib"
    preprocessor_path = "models/congestion_detection_preprocessor.joblib"

    if not os.path.exists(model_path) or not os.path.exists(preprocessor_path):
        pytest.skip("Pre-trained congestion model artifacts not found — run training first")

    from src.congestion_detection.predict import load_model, predict

    model = load_model(model_path)
    preprocessor = load_cong_preprocessor(preprocessor_path)

    result = predict(model, preprocessor, input_data)

    assert "congestion_level" in result, "Response must contain 'congestion_level' key"
    assert result["congestion_level"] in VALID_CONGESTION_LEVELS, (
        f"Expected congestion_level in {VALID_CONGESTION_LEVELS}, got '{result['congestion_level']}'"
    )


# ---------------------------------------------------------------------------
# Property 10: API returns HTTP 422 for invalid request bodies
# Feature: railways-ml-system, Property 10: API returns HTTP 422 for invalid request bodies
# Validates: Requirements 7.7
# ---------------------------------------------------------------------------

from unittest.mock import patch
from fastapi.testclient import TestClient

_MOCK_ARTIFACTS = {
    "alert_model": None,
    "alert_preprocessor": None,
    "maintenance_regressor": None,
    "maintenance_classifier": None,
    "maintenance_preprocessor": None,
    "delay_model": None,
    "delay_preprocessor": None,
    "congestion_model": None,
    "congestion_preprocessor": None,
}

_MOCK_CONFIG = {
    "random_seed": 42, "data": {}, "models": {}, "paths": {"logs": "logs/", "models": "models/"},
    "logging": {"level": "INFO", "max_bytes": 10485760, "backup_count": 5},
}

_ALERT_REQUIRED = ["alert_type", "delay_impact", "safety_risk", "affected_trains", "route_busy", "peak_hour"]
_MAINTENANCE_REQUIRED = ["temperature", "vibration", "usage_hours", "last_service_days", "fault_history"]
_DELAY_REQUIRED = ["distance", "weather", "congestion_level", "previous_delay", "train_type"]
_CONGESTION_REQUIRED = ["train_density", "station_load", "time_of_day", "route_type"]

_VALID_ALERT = {"alert_type": "signal_failure", "delay_impact": 5.0, "safety_risk": 0.5, "affected_trains": 2, "route_busy": 1, "peak_hour": 0}
_VALID_MAINTENANCE = {"temperature": 70.0, "vibration": 3.0, "usage_hours": 5000.0, "last_service_days": 20, "fault_history": 1}
_VALID_DELAY = {"distance": 300.0, "weather": "clear", "congestion_level": "Low", "previous_delay": 0.0, "train_type": "express"}
_VALID_CONGESTION = {"train_density": 10.0, "station_load": 800.0, "time_of_day": "morning", "route_type": "urban"}


def _get_test_client():
    with patch("api.main.load_all_artifacts", return_value=_MOCK_ARTIFACTS), \
         patch("api.main.load_config", return_value=_MOCK_CONFIG):
        from api.main import app
        return TestClient(app, raise_server_exceptions=False)


@settings(max_examples=100)
@given(st.sampled_from(_ALERT_REQUIRED))
def test_api_422_alert_missing_field(missing_field):
    """Property 10: API returns HTTP 422 for invalid request bodies (alert, missing field)."""
    body = {k: v for k, v in _VALID_ALERT.items() if k != missing_field}
    client = _get_test_client()
    resp = client.post("/predict-alert", json=body)
    assert resp.status_code == 422, f"Expected 422 when '{missing_field}' is missing, got {resp.status_code}"


@settings(max_examples=100)
@given(st.sampled_from(_MAINTENANCE_REQUIRED))
def test_api_422_maintenance_missing_field(missing_field):
    """Property 10: API returns HTTP 422 for invalid request bodies (maintenance, missing field)."""
    body = {k: v for k, v in _VALID_MAINTENANCE.items() if k != missing_field}
    client = _get_test_client()
    resp = client.post("/predict-maintenance", json=body)
    assert resp.status_code == 422, f"Expected 422 when '{missing_field}' is missing, got {resp.status_code}"


@settings(max_examples=100)
@given(st.sampled_from(_DELAY_REQUIRED))
def test_api_422_delay_missing_field(missing_field):
    """Property 10: API returns HTTP 422 for invalid request bodies (delay, missing field)."""
    body = {k: v for k, v in _VALID_DELAY.items() if k != missing_field}
    client = _get_test_client()
    resp = client.post("/predict-delay", json=body)
    assert resp.status_code == 422, f"Expected 422 when '{missing_field}' is missing, got {resp.status_code}"


@settings(max_examples=100)
@given(st.sampled_from(_CONGESTION_REQUIRED))
def test_api_422_congestion_missing_field(missing_field):
    """Property 10: API returns HTTP 422 for invalid request bodies (congestion, missing field)."""
    body = {k: v for k, v in _VALID_CONGESTION.items() if k != missing_field}
    client = _get_test_client()
    resp = client.post("/predict-congestion", json=body)
    assert resp.status_code == 422, f"Expected 422 when '{missing_field}' is missing, got {resp.status_code}"


# ---------------------------------------------------------------------------
# Property 11: Configuration round-trip
# Feature: railways-ml-system, Property 11: Configuration round-trip
# Validates: Requirements 8.4
# ---------------------------------------------------------------------------
# Property 12: Missing configuration key raises descriptive error
# Feature: railways-ml-system, Property 12: Missing configuration key raises descriptive error
# Validates: Requirements 8.5
# ---------------------------------------------------------------------------

import yaml as _yaml
from src.utils import load_config as _load_config, REQUIRED_CONFIG_KEYS as _REQUIRED_KEYS

# Strategy: generate a dict that always has all required top-level keys
_required_key_strategy = st.fixed_dictionaries({
    key: st.one_of(
        st.integers(min_value=0, max_value=9999),
        st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"))),
    )
    for key in _REQUIRED_KEYS
})


@settings(max_examples=100)
@given(_required_key_strategy)
def test_config_round_trip(config_data):
    """Property 11: Configuration round-trip.

    Writing a config dict to YAML and loading it must return identical values.
    """
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        _yaml.dump(config_data, f)
        path = f.name
    try:
        loaded = _load_config(path)
        for key in _REQUIRED_KEYS:
            assert loaded[key] == config_data[key], (
                f"Round-trip mismatch for key '{key}': expected {config_data[key]!r}, got {loaded[key]!r}"
            )
    finally:
        os.unlink(path)


@settings(max_examples=100)
@given(_required_key_strategy, st.sampled_from(_REQUIRED_KEYS))
def test_config_missing_key_raises_descriptive_error(config_data, missing_key):
    """Property 12: Missing configuration key raises descriptive error.

    Removing any required key from the config must cause load_config to raise
    a KeyError whose message names the missing key.
    """
    incomplete = {k: v for k, v in config_data.items() if k != missing_key}
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        _yaml.dump(incomplete, f)
        path = f.name
    try:
        with pytest.raises(KeyError) as exc_info:
            _load_config(path)
        assert missing_key in str(exc_info.value), (
            f"KeyError should name '{missing_key}', got: {exc_info.value}"
        )
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Property 8: Reproducibility via fixed random seed
# Feature: railways-ml-system, Property 8: Reproducibility via fixed random seed
# Validates: Requirements 1.4, 9.1
# ---------------------------------------------------------------------------

from src.alert_prioritization.preprocess import fit_preprocessor as alert_fit_preprocessor
from src.alert_prioritization.preprocess import transform as alert_transform
from src.alert_prioritization.train import train as alert_train

from src.delay_prediction.preprocess import fit_preprocessor as delay_fit_preprocessor2
from src.delay_prediction.preprocess import transform as delay_transform2
from src.delay_prediction.train import train as delay_train

_REPRO_CONFIG = {
    "random_seed": 42,
    "data": {},
    "models": {
        "alert": {"rf_n_estimators": 10, "xgb_n_estimators": 10},
        "delay": {"xgb_n_estimators": 10},
    },
    "paths": {"logs": "logs/", "models": "models/"},
    "logging": {"level": "WARNING", "max_bytes": 10485760, "backup_count": 5},
}


def _make_alert_train_data(n=80):
    rng = np.random.default_rng(42)
    alert_types = ["signal_failure", "track_fault", "engine_issue", "weather_alert", "passenger_emergency"]
    df = pd.DataFrame({
        "alert_type": [alert_types[i % len(alert_types)] for i in range(n)],
        "delay_impact": rng.uniform(0, 10, n),
        "safety_risk": rng.uniform(0, 1, n),
        "affected_trains": rng.integers(1, 20, n).astype(float),
        "route_busy": rng.integers(0, 2, n).astype(float),
        "peak_hour": rng.integers(0, 2, n).astype(float),
        "priority": [["Critical", "High", "Medium", "Low"][i % 4] for i in range(n)],
    })
    pipeline, X = alert_fit_preprocessor(df, {})
    y = df["priority"].reset_index(drop=True)
    return X, y, pipeline, df


def _make_delay_train_data(n=80):
    rng = np.random.default_rng(42)
    df = pd.DataFrame({
        "distance": rng.uniform(10, 2000, n),
        "weather": rng.choice(["clear", "rain", "fog", "storm"], n),
        "congestion_level": rng.choice(["Low", "Medium", "High"], n),
        "previous_delay": rng.uniform(0, 120, n),
        "train_type": rng.choice(["express", "passenger", "freight"], n),
        "delay_minutes": rng.uniform(0, 180, n),
    })
    pipeline, X = delay_fit_preprocessor2(df, {})
    y = df["delay_minutes"].reset_index(drop=True)
    return X, y, pipeline, df


@settings(max_examples=100)
@given(st.just(None))
def test_reproducibility_alert_training(_):
    """Property 8: Reproducibility via fixed random seed (alert).

    Training twice with the same seed must yield identical predictions.
    """
    X, y, pipeline, df = _make_alert_train_data()
    split = 60
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train = y.iloc[:split]

    models1 = alert_train(X_train, y_train, _REPRO_CONFIG)
    models2 = alert_train(X_train, y_train, _REPRO_CONFIG)

    preds1 = models1["random_forest"].predict(X_test)
    preds2 = models2["random_forest"].predict(X_test)

    assert list(preds1) == list(preds2), "Alert RF predictions differ between runs with same seed"


@settings(max_examples=100)
@given(st.just(None))
def test_reproducibility_delay_training(_):
    """Property 8: Reproducibility via fixed random seed (delay).

    Training twice with the same seed must yield identical predictions.
    """
    X, y, pipeline, df = _make_delay_train_data()
    split = 60
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train = y.iloc[:split]

    models1 = delay_train(X_train, y_train, _REPRO_CONFIG)
    models2 = delay_train(X_train, y_train, _REPRO_CONFIG)

    preds1 = models1["linear_regression"].predict(X_test)
    preds2 = models2["linear_regression"].predict(X_test)

    np.testing.assert_array_equal(preds1, preds2, err_msg="Delay LR predictions differ between runs with same seed")
