# Implementation Plan: AI-Powered Indian Railways Smart Traffic Management Platform

## Overview

Incremental implementation starting from project scaffolding through all four ML modules, the FastAPI service, and the full test suite. Each task builds on the previous so no code is left unintegrated.

## Tasks

- [x] 1. Project scaffolding — directory structure, config, logging, and dependencies
  - Create `configs/config.yaml` with all top-level keys: `random_seed`, `data`, `models`, `paths`, `logging`
  - Create `src/utils.py` with `setup_logger(name, config)` (StreamHandler + RotatingFileHandler) and `load_config(path)` (raises `KeyError` with key name on missing required key)
  - Populate `requirements.txt` with all runtime dependencies: fastapi, uvicorn, scikit-learn, xgboost, hypothesis, pydantic, pyyaml, joblib, pandas, numpy, pytest, httpx
  - Ensure `data/raw/`, `models/`, `logs/` directories exist (add `.gitkeep` files)
  - _Requirements: 8.1, 8.4, 8.5, 9.4_

- [x] 2. Synthetic data generation
  - [x] 2.1 Implement `src/data_generator.py` with four generator functions
    - `generate_alert_data(config)` → DataFrame with columns: alert_type, delay_impact, safety_risk, affected_trains, route_busy, peak_hour, priority
    - `generate_maintenance_data(config)` → DataFrame with columns: temperature, vibration, usage_hours, last_service_days, fault_history, risk_score, status
    - `generate_delay_data(config)` → DataFrame with columns: distance, weather, congestion_level, previous_delay, train_type, delay_minutes
    - `generate_congestion_data(config)` → DataFrame with columns: train_density, station_load, time_of_day, route_type, congestion_level
    - Each function: fixed seed from config, 3000–5000 rows, realistic distributions, balanced classes (no class > 60%), saves CSV to `data/raw/`, logs file path and row count
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Write unit tests for data generator (`tests/unit/test_data_generator.py`)
    - Test file existence after generation, row count in [3000, 5000], correct column names, CSV readability
    - _Requirements: 1.1, 1.2_

  - [x] 2.3 Write property test for class balance — Property 9
    - `# Feature: railways-ml-system, Property 9: Class balance in generated datasets`
    - Generate each classification dataset; assert no single label exceeds 60% of rows
    - **Property 9: Class balance in generated datasets**
    - **Validates: Requirements 1.3**

- [x] 3. Alert Prioritization module
  - [x] 3.1 Implement `src/alert_prioritization/preprocess.py`
    - `fit_preprocessor(df, config)`: label-encode `alert_type`, StandardScaler on numeric features, returns (pipeline, transformed_df)
    - `transform(pipeline, df)`: apply fitted pipeline; raise `ValueError("Missing required field: <field>")` on missing field; raise `ValueError("Unexpected value '<v>' for field '<f>'")` on unknown categorical
    - `save_preprocessor(pipeline, path)` and `load_preprocessor(path)` using joblib
    - _Requirements: 2.1, 2.6, 2.7, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.2 Implement `src/alert_prioritization/train.py`
    - `train(X_train, y_train, config)`: fit RandomForest and XGBoost classifiers; set random seed from config
    - `evaluate(models, X_test, y_test)`: compute Accuracy, Precision, Recall, F1 (weighted) per model; log results
    - `save_model(model, path)`: joblib serialize
    - Script entry point: load config → load data → preprocess → train → evaluate → select best by F1 → save model + preprocessor
    - _Requirements: 2.3, 2.4, 2.5, 8.2, 8.3, 9.1, 9.5_

  - [x] 3.3 Implement `src/alert_prioritization/predict.py`
    - `load_model(path)` and `predict(model, preprocessor, input_data)`: preprocess input dict → return `{"priority": label}`
    - _Requirements: 2.2, 2.6_

  - [x] 3.4 Implement `src/alert_prioritization/utils.py`
    - Module-level helpers: re-export `setup_logger` and `load_config` from `src/utils.py`, plus any alert-specific constants
    - _Requirements: 9.2, 9.3_

  - [x] 3.5 Write unit tests for alert preprocessing and training (`tests/unit/test_alert_preprocess.py`, `tests/unit/test_alert_train.py`)
    - Preprocessing: correct encoding of known categorical, correct scaling, error on missing field, error on unknown categorical
    - Training: artifact file exists after run, metric keys present, best-model selection with mocked scores
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 6.5_

  - [x] 3.6 Write property test for alert label validity — Property 1
    - `# Feature: railways-ml-system, Property 1: Alert priority label validity`
    - Generate random `AlertRequest`-shaped dicts via Hypothesis → assert output in `{"Critical","High","Medium","Low"}`
    - **Property 1: Alert priority label validity**
    - **Validates: Requirements 2.2**

  - [x] 3.7 Write property test for preprocessing round-trip — Property 6 (alert)
    - `# Feature: railways-ml-system, Property 6: Preprocessing round-trip consistency`
    - Generate random valid alert records → assert `load_preprocessor(path).transform(x) == fitted.transform(x)`
    - **Property 6: Preprocessing round-trip consistency**
    - **Validates: Requirements 2.6, 6.1, 6.4**

  - [x] 3.8 Write property test for preprocessing error on invalid input — Property 7 (alert)
    - `# Feature: railways-ml-system, Property 7: Preprocessing error on unexpected feature values`
    - Generate alert inputs with missing or invalid fields → assert `ValueError` raised with field name in message
    - **Property 7: Preprocessing error on unexpected feature values**
    - **Validates: Requirements 2.7, 6.5**

- [x] 4. Predictive Maintenance module
  - [x] 4.1 Implement `src/predictive_maintenance/preprocess.py`
    - `fit_preprocessor(df, config)`: StandardScaler on all numeric features (no categoricals); save/load via joblib
    - `transform(pipeline, df)`: raise `ValueError` on missing field or out-of-range value
    - _Requirements: 3.1, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.2 Implement `src/predictive_maintenance/train.py`
    - `train(X_train, y_train_reg, y_train_clf, config)`: fit RF regressor (risk_score) and RF classifier (status); set seed
    - `evaluate(models, X_test, y_test_reg, y_test_clf)`: RMSE + MAE for regressor, Accuracy + F1 for classifier; log all metrics
    - `save_model(model, path)`: joblib serialize both artifacts
    - LSTM stub: `train_lstm_stub(X, config)` returns placeholder dict with same input signature
    - Script entry point: full pipeline → save `maintenance_regressor.joblib`, `maintenance_classifier.joblib`, `maintenance_preprocessor.joblib`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.2, 8.3, 9.1, 9.5_

  - [x] 4.3 Implement `src/predictive_maintenance/predict.py`
    - `predict(regressor, classifier, preprocessor, input_data)`: return `{"risk_score": float, "status": label}`
    - Clamp risk_score to [0, 100] after regression
    - _Requirements: 3.2, 3.3_

  - [x] 4.4 Implement `src/predictive_maintenance/utils.py`
    - Module-level helpers and maintenance-specific constants
    - _Requirements: 9.2, 9.3_

  - [x] 4.5 Write unit tests for maintenance preprocessing and training (`tests/unit/test_maintenance_preprocess.py`, `tests/unit/test_maintenance_train.py`)
    - Preprocessing: correct scaling, error on missing field, error on out-of-range value
    - Training: both artifact files exist, metric keys present in evaluation output
    - _Requirements: 3.4, 3.5, 3.6, 6.5_

  - [x] 4.6 Write property tests for maintenance outputs — Properties 3 and 4
    - `# Feature: railways-ml-system, Property 3: Maintenance status label validity`
    - `# Feature: railways-ml-system, Property 4: Risk score range invariant`
    - Generate random `MaintenanceRequest`-shaped dicts → assert status in `{"Healthy","Warning","Critical"}` and `0.0 <= risk_score <= 100.0`
    - **Property 3: Maintenance status label validity** — **Validates: Requirements 3.3**
    - **Property 4: Risk score range invariant** — **Validates: Requirements 3.2**

- [x] 5. Delay Prediction module
  - [x] 5.1 Implement `src/delay_prediction/preprocess.py`
    - `fit_preprocessor(df, config)`: label-encode `weather`, `congestion_level`, `train_type`; StandardScaler on numeric features
    - `transform(pipeline, df)`: raise `ValueError` on missing field or unknown categorical
    - _Requirements: 4.1, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Implement `src/delay_prediction/train.py`
    - `train(X_train, y_train, config)`: fit LinearRegression and XGBoost regressor; set seed
    - `evaluate(models, X_test, y_test)`: RMSE + MAE per model; log results; select best by lower RMSE
    - Script entry point: full pipeline → save `delay_prediction_model.joblib`, `delay_prediction_preprocessor.joblib`
    - _Requirements: 4.3, 4.4, 4.5, 8.2, 8.3, 9.1, 9.5_

  - [x] 5.3 Implement `src/delay_prediction/predict.py`
    - `predict(model, preprocessor, input_data)`: return `{"delay_minutes": max(0.0, prediction)}`
    - _Requirements: 4.2, 4.6_

  - [x] 5.4 Implement `src/delay_prediction/utils.py`
    - Module-level helpers and delay-specific constants
    - _Requirements: 9.2, 9.3_

  - [x] 5.5 Write unit tests for delay preprocessing and training (`tests/unit/test_delay_preprocess.py`, `tests/unit/test_delay_train.py`)
    - Preprocessing: correct encoding, correct scaling, error on missing field, error on unknown categorical
    - Training: artifact file exists, metric keys present, best-model selection (lower RMSE wins)
    - _Requirements: 4.3, 4.4, 4.5, 6.5_

  - [x] 5.6 Write property tests for delay outputs — Properties 5 and 6 (delay)
    - `# Feature: railways-ml-system, Property 5: Delay non-negativity invariant`
    - `# Feature: railways-ml-system, Property 6: Preprocessing round-trip consistency`
    - Generate random `DelayRequest`-shaped dicts → assert `delay_minutes >= 0.0`; assert preprocessor round-trip equality
    - **Property 5: Delay non-negativity invariant** — **Validates: Requirements 4.2**
    - **Property 6: Preprocessing round-trip consistency (delay)** — **Validates: Requirements 4.6, 6.1, 6.4**

- [x] 6. Congestion Detection module
  - [x] 6.1 Implement `src/congestion_detection/preprocess.py`
    - `fit_preprocessor(df, config)`: label-encode `time_of_day`, `route_type`; StandardScaler on numeric features
    - `transform(pipeline, df)`: raise `ValueError` on missing field or unknown categorical
    - _Requirements: 5.1, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Implement `src/congestion_detection/train.py`
    - `train(X_train, y_train, config)`: fit RandomForest classifier; fit KMeans (unsupervised); log cluster-to-label mapping
    - `evaluate(models, X_test, y_test)`: Accuracy, Precision, Recall, F1 for RF; log results
    - Script entry point: full pipeline → save `congestion_detection_model.joblib`, `congestion_detection_preprocessor.joblib`
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 8.2, 8.3, 9.1, 9.5_

  - [x] 6.3 Implement `src/congestion_detection/predict.py`
    - `predict(model, preprocessor, input_data)`: use RF model → return `{"congestion_level": label}`
    - _Requirements: 5.2, 5.7_

  - [x] 6.4 Implement `src/congestion_detection/utils.py`
    - Module-level helpers and congestion-specific constants
    - _Requirements: 9.2, 9.3_

  - [x] 6.5 Write unit tests for congestion preprocessing and training (`tests/unit/test_congestion_preprocess.py`, `tests/unit/test_congestion_train.py`)
    - Preprocessing: correct encoding, correct scaling, error on missing field, error on unknown categorical
    - Training: artifact file exists, metric keys present
    - _Requirements: 5.3, 5.5, 5.6, 6.5_

  - [x] 6.6 Write property test for congestion label validity — Property 2
    - `# Feature: railways-ml-system, Property 2: Congestion level label validity`
    - Generate random `CongestionRequest`-shaped dicts → assert output in `{"Low","Medium","High"}`
    - **Property 2: Congestion level label validity**
    - **Validates: Requirements 5.2**

- [x] 7. Checkpoint — train all four modules end-to-end
  - Run each module's `train.py` as a script to verify all `.joblib` artifacts are produced under `models/`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. FastAPI service
  - [x] 8.1 Implement `api/schemas.py`
    - Define Pydantic request models: `AlertRequest`, `MaintenanceRequest`, `DelayRequest`, `CongestionRequest`
    - Define Pydantic response models: `AlertResponse`, `MaintenanceResponse`, `DelayResponse`, `CongestionResponse` with `Literal` type constraints
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7_

  - [x] 8.2 Implement `api/dependencies.py`
    - `load_all_artifacts(config)`: load all nine `.joblib` files into a dict; raise `FileNotFoundError` with missing path if any artifact is absent
    - _Requirements: 7.5, 7.6_

  - [x] 8.3 Implement `api/main.py`
    - FastAPI app with lifespan handler: call `load_all_artifacts` at startup; log error and re-raise on `FileNotFoundError`
    - `POST /predict-alert` → call alert `predict()` → return `AlertResponse`
    - `POST /predict-maintenance` → call maintenance `predict()` → return `MaintenanceResponse`
    - `POST /predict-delay` → call delay `predict()` → return `DelayResponse`
    - `POST /predict-congestion` → call congestion `predict()` → return `CongestionResponse`
    - Global exception handler: catch unhandled exceptions → log full stack trace at ERROR → return HTTP 500 `{"detail": "Internal prediction error"}`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1_

  - [x] 8.4 Write unit tests for API endpoints (`tests/unit/test_api.py`)
    - HTTP 200 with valid body for each endpoint
    - HTTP 422 with missing required field
    - HTTP 422 with wrong field type
    - HTTP 500 on mocked model exception
    - Startup failure when artifact file is missing
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7, 7.8_

  - [x] 8.5 Write property test for HTTP 422 on invalid bodies — Property 10
    - `# Feature: railways-ml-system, Property 10: API returns HTTP 422 for invalid request bodies`
    - Generate malformed request bodies (missing fields, wrong types) for all four endpoints → assert HTTP 422
    - **Property 10: API returns HTTP 422 for invalid request bodies**
    - **Validates: Requirements 7.7**

- [x] 9. Configuration and logging property tests
  - [x] 9.1 Write unit tests for config loader (`tests/unit/test_config.py`)
    - Correct value retrieval for present keys
    - `KeyError` raised with key name for missing required key
    - _Requirements: 8.4, 8.5_

  - [x] 9.2 Write property tests for config round-trip and missing key — Properties 11 and 12
    - `# Feature: railways-ml-system, Property 11: Configuration round-trip`
    - `# Feature: railways-ml-system, Property 12: Missing configuration key raises descriptive error`
    - Generate arbitrary config dicts → write to temp YAML → load → assert all values match
    - Generate config dicts with one key removed → assert `KeyError` names the missing key
    - **Property 11: Configuration round-trip** — **Validates: Requirements 8.4**
    - **Property 12: Missing configuration key raises descriptive error** — **Validates: Requirements 8.5**

- [x] 10. Reproducibility property test — Property 8
  - [x] 10.1 Write property test for training reproducibility
    - `# Feature: railways-ml-system, Property 8: Reproducibility via fixed random seed`
    - For each module, run training twice with the same seed and dataset → assert predictions identical on same test inputs
    - **Property 8: Reproducibility via fixed random seed**
    - **Validates: Requirements 1.4, 9.1**

- [x] 11. Consolidate all property-based tests into `tests/property/test_properties.py`
  - Move or import all 12 Hypothesis property tests (Properties 1–12) into a single file
  - Ensure each test is tagged with the required comment format: `# Feature: railways-ml-system, Property <N>: <text>`
  - Minimum 100 iterations per property (`@settings(max_examples=100)`)
  - _Requirements: 9.1, 9.2_

- [x] 12. Integration tests (`tests/integration/test_pipeline_e2e.py`)
  - End-to-end pipeline test per module: generate data → preprocess → train → predict → assert artifact files exist and predictions are valid types/ranges
  - API startup test: load real model artifacts → assert all four endpoints respond HTTP 200 to valid requests
  - _Requirements: 7.5, 9.5_

- [x] 13. Final checkpoint — full test suite
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use Hypothesis with `@settings(max_examples=100)` minimum
- All 12 correctness properties from the design document are covered across tasks 3–11
- Checkpoints at tasks 7 and 13 validate incremental progress
