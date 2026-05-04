# Requirements Document

## Introduction

The AI-powered Indian Railways Smart Traffic Management Platform is a production-ready ML system that provides intelligent decision support for railway operations. The platform ingests operational data and applies machine learning to four core domains: alert prioritization, predictive maintenance, train delay prediction, and congestion detection. Each domain exposes predictions through a unified FastAPI service, enabling real-time operational decisions.

## Glossary

- **Alert_Prioritizer**: The ML component that classifies operational alerts into severity levels.
- **Maintenance_Predictor**: The ML component that estimates equipment failure risk and operational status.
- **Delay_Predictor**: The ML component that forecasts train delay in minutes.
- **Congestion_Detector**: The ML component that classifies route/station congestion levels.
- **API_Service**: The FastAPI application that exposes all four ML modules as REST endpoints.
- **Pipeline**: The sequence of preprocessing, training, and prediction steps for a single module.
- **Risk_Score**: A numeric value in the range [0, 100] representing equipment failure probability.
- **Alert_Priority**: One of four discrete labels — Critical, High, Medium, Low.
- **Congestion_Level**: One of three discrete labels — Low, Medium, High.
- **Maintenance_Status**: One of three discrete labels — Healthy, Warning, Critical.
- **Synthetic_Dataset**: A programmatically generated dataset with realistic distributions used for training and evaluation.
- **Model_Artifact**: A serialized trained model saved as a `.joblib` file in the `models/` directory.

---

## Requirements

### Requirement 1: Synthetic Data Generation

**User Story:** As a data scientist, I want realistic synthetic datasets for all four modules, so that I can train and evaluate models without requiring access to live railway data.

#### Acceptance Criteria

1. THE Data_Generator SHALL produce one dataset per module containing between 3000 and 5000 rows.
2. THE Data_Generator SHALL save each dataset as a CSV file under `data/raw/`.
3. THE Data_Generator SHALL apply realistic statistical distributions, noise, and class balance to each dataset.
4. THE Data_Generator SHALL use a fixed random seed to ensure reproducibility across runs.
5. WHEN the Data_Generator is executed, THE Data_Generator SHALL log the output file path and row count for each generated dataset.

---

### Requirement 2: Alert Prioritization Module

**User Story:** As a railway operations controller, I want incoming alerts classified by priority, so that I can address the most critical issues first.

#### Acceptance Criteria

1. THE Alert_Prioritizer SHALL accept the features: `alert_type`, `delay_impact`, `safety_risk`, `affected_trains`, `route_busy`, and `peak_hour`.
2. THE Alert_Prioritizer SHALL classify each alert into one of four labels: Critical, High, Medium, or Low.
3. THE Alert_Prioritizer SHALL train both a RandomForest classifier and an XGBoost classifier and select the model with the highest F1-score (weighted) as the best model.
4. WHEN training completes, THE Alert_Prioritizer SHALL evaluate each model using Accuracy, Precision, Recall, and F1-score and log the results.
5. WHEN training completes, THE Alert_Prioritizer SHALL save the best model as a `.joblib` file in `models/`.
6. WHEN a prediction request is received, THE Alert_Prioritizer SHALL preprocess the input using the same encoding and scaling applied during training before returning a prediction.
7. IF an input feature value is missing or out of expected range, THEN THE Alert_Prioritizer SHALL return a descriptive error message.

---

### Requirement 3: Predictive Maintenance Module

**User Story:** As a maintenance engineer, I want to know the failure risk and operational status of equipment, so that I can schedule preventive maintenance before failures occur.

#### Acceptance Criteria

1. THE Maintenance_Predictor SHALL accept the features: `temperature`, `vibration`, `usage_hours`, `last_service_days`, and `fault_history`.
2. THE Maintenance_Predictor SHALL output a `risk_score` in the range [0, 100] using a regression model.
3. THE Maintenance_Predictor SHALL output a `status` label (Healthy, Warning, Critical) using a classification model.
4. THE Maintenance_Predictor SHALL train a RandomForest regressor for risk score prediction and a RandomForest classifier for status classification.
5. WHEN training completes, THE Maintenance_Predictor SHALL evaluate the regressor using RMSE and MAE, and the classifier using Accuracy and F1-score, and log the results.
6. WHEN training completes, THE Maintenance_Predictor SHALL save both trained models as `.joblib` files in `models/`.
7. WHERE an LSTM placeholder is configured, THE Maintenance_Predictor SHALL include a stub implementation that accepts the same input features and returns a placeholder prediction.

---

### Requirement 4: Delay Prediction Module

**User Story:** As a train scheduler, I want to predict the delay in minutes for a given train journey, so that I can proactively communicate delays to passengers and adjust schedules.

#### Acceptance Criteria

1. THE Delay_Predictor SHALL accept the features: `distance`, `weather`, `congestion_level`, `previous_delay`, and `train_type`.
2. THE Delay_Predictor SHALL output a predicted delay value in minutes as a non-negative float.
3. THE Delay_Predictor SHALL train both a Linear Regression model and an XGBoost regressor and select the model with the lower RMSE as the best model.
4. WHEN training completes, THE Delay_Predictor SHALL evaluate each model using RMSE and MAE and log the results.
5. WHEN training completes, THE Delay_Predictor SHALL save the best model as a `.joblib` file in `models/`.
6. WHEN a prediction request is received, THE Delay_Predictor SHALL preprocess the input using the same encoding and scaling applied during training before returning a prediction.

---

### Requirement 5: Congestion Detection Module

**User Story:** As a network operations manager, I want to detect the congestion level on routes and at stations, so that I can reroute trains and allocate resources efficiently.

#### Acceptance Criteria

1. THE Congestion_Detector SHALL accept the features: `train_density`, `station_load`, `time_of_day`, and `route_type`.
2. THE Congestion_Detector SHALL classify each observation into one of three congestion levels: Low, Medium, or High.
3. THE Congestion_Detector SHALL train a RandomForest classifier as the primary supervised model.
4. THE Congestion_Detector SHALL train a KMeans clustering model as an unsupervised comparison and log cluster-to-label mapping.
5. WHEN training completes, THE Congestion_Detector SHALL evaluate the RandomForest model using Accuracy, Precision, Recall, and F1-score and log the results.
6. WHEN training completes, THE Congestion_Detector SHALL save the RandomForest model as a `.joblib` file in `models/`.
7. WHEN a prediction request is received, THE Congestion_Detector SHALL use the RandomForest model to return the congestion level label.

---

### Requirement 6: Preprocessing Pipeline

**User Story:** As a data engineer, I want a consistent preprocessing pipeline per module, so that training and inference use identical transformations and avoid data leakage.

#### Acceptance Criteria

1. THE Pipeline SHALL encode all categorical features using a consistent strategy (e.g., label encoding or one-hot encoding) defined per module.
2. THE Pipeline SHALL scale all numeric features using a StandardScaler or MinMaxScaler fitted only on training data.
3. WHEN the preprocessing pipeline is fitted during training, THE Pipeline SHALL save the fitted transformers as `.joblib` artifacts alongside the model.
4. WHEN a prediction request is received, THE Pipeline SHALL load the saved transformers and apply them to the input before passing data to the model.
5. IF a preprocessing step encounters an unexpected value, THEN THE Pipeline SHALL raise a descriptive exception that identifies the field and value.

---

### Requirement 7: REST API Service

**User Story:** As a platform integrator, I want a REST API that exposes all four ML modules, so that downstream systems can request predictions over HTTP without knowing the model internals.

#### Acceptance Criteria

1. THE API_Service SHALL expose a `POST /predict-alert` endpoint that accepts alert features as JSON and returns the predicted `Alert_Priority` label.
2. THE API_Service SHALL expose a `POST /predict-maintenance` endpoint that accepts equipment features as JSON and returns the predicted `risk_score` and `status` label.
3. THE API_Service SHALL expose a `POST /predict-delay` endpoint that accepts journey features as JSON and returns the predicted delay in minutes.
4. THE API_Service SHALL expose a `POST /predict-congestion` endpoint that accepts route/station features as JSON and returns the predicted `Congestion_Level` label.
5. WHEN the API_Service starts, THE API_Service SHALL load all Model_Artifacts from `models/` into memory.
6. IF a required Model_Artifact is not found at startup, THEN THE API_Service SHALL log an error and raise a startup exception identifying the missing artifact.
7. WHEN a request body fails Pydantic validation, THE API_Service SHALL return HTTP 422 with a descriptive validation error.
8. IF an unhandled exception occurs during prediction, THEN THE API_Service SHALL return HTTP 500 with an error message and log the full stack trace.

---

### Requirement 8: Logging and Configuration

**User Story:** As a DevOps engineer, I want centralized logging and a configuration file for all parameters, so that I can monitor system behavior and tune parameters without modifying source code.

#### Acceptance Criteria

1. THE System SHALL write structured log messages to both the console and a rotating file under `logs/`.
2. WHEN any module starts a training run, THE System SHALL log the module name, dataset path, and hyperparameter values.
3. WHEN any model evaluation completes, THE System SHALL log all metric names and values.
4. THE System SHALL read all tunable parameters (e.g., random seeds, model hyperparameters, file paths) from a YAML or JSON configuration file under `configs/`.
5. IF a required configuration key is missing, THEN THE System SHALL raise a descriptive error identifying the missing key before any processing begins.

---

### Requirement 9: Code Quality and Reproducibility

**User Story:** As a developer maintaining this system, I want clean, modular, and reproducible code, so that I can extend or debug any module independently.

#### Acceptance Criteria

1. THE System SHALL set a global random seed in each module's entry point to ensure reproducible training runs.
2. THE System SHALL organize each module into four files: `preprocess.py`, `train.py`, `predict.py`, and `utils.py`.
3. THE System SHALL include docstrings on all public classes and functions describing parameters and return values.
4. THE System SHALL use Python logging (not `print` statements) for all runtime output.
5. WHEN a module is run as a standalone script, THE System SHALL execute the full pipeline (data load → preprocess → train → evaluate → save) without requiring external orchestration.
