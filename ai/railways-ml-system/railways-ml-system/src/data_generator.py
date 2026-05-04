"""Synthetic data generator for the Railways ML System.

Generates realistic datasets for all four ML modules:
- Alert Prioritization
- Predictive Maintenance
- Delay Prediction
- Congestion Detection
"""

import os

import numpy as np
import pandas as pd

from src.utils import load_config, setup_logger


def generate_alert_data(config: dict) -> pd.DataFrame:
    """Generate synthetic alert prioritization dataset.

    Args:
        config: Configuration dict with keys 'random_seed', 'data' (n_samples, alert path).

    Returns:
        DataFrame with columns: alert_type, delay_impact, safety_risk,
        affected_trains, route_busy, peak_hour, priority.
    """
    logger = setup_logger("data_generator", config)
    rng = np.random.default_rng(config["random_seed"])
    n = config["data"]["n_samples"]

    alert_types = ["signal_failure", "track_fault", "engine_issue", "weather_alert", "passenger_emergency"]
    alert_type = rng.choice(alert_types, size=n)

    delay_impact = rng.exponential(scale=15.0, size=n).clip(0, 120)
    safety_risk = rng.beta(2, 5, size=n)  # skewed toward lower risk
    affected_trains = rng.integers(1, 20, size=n)
    route_busy = rng.integers(0, 2, size=n)
    peak_hour = rng.integers(0, 2, size=n)

    # Derive priority from features to ensure realistic correlation
    # Score: higher = more critical
    score = (
        safety_risk * 50
        + delay_impact / 120 * 30
        + affected_trains / 20 * 10
        + route_busy * 5
        + peak_hour * 5
    )

    # Assign labels with balanced distribution (no class > 60%)
    # Use quantile-based thresholds to ensure balance
    q25, q50, q75 = np.percentile(score, [25, 50, 75])
    priority = np.where(
        score >= q75, "Critical",
        np.where(score >= q50, "High",
                 np.where(score >= q25, "Medium", "Low"))
    )

    df = pd.DataFrame({
        "alert_type": alert_type,
        "delay_impact": delay_impact.round(2),
        "safety_risk": safety_risk.round(4),
        "affected_trains": affected_trains,
        "route_busy": route_busy,
        "peak_hour": peak_hour,
        "priority": priority,
    })

    out_path = config["data"]["alert"]
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)
    logger.info("Alert dataset saved to %s (%d rows)", out_path, len(df))
    return df


def generate_maintenance_data(config: dict) -> pd.DataFrame:
    """Generate synthetic predictive maintenance dataset.

    Args:
        config: Configuration dict with keys 'random_seed', 'data' (n_samples, maintenance path).

    Returns:
        DataFrame with columns: temperature, vibration, usage_hours,
        last_service_days, fault_history, risk_score, status.
    """
    logger = setup_logger("data_generator", config)
    rng = np.random.default_rng(config["random_seed"] + 1)
    n = config["data"]["n_samples"]

    temperature = rng.normal(loc=75.0, scale=15.0, size=n).clip(20, 150)
    vibration = rng.exponential(scale=2.5, size=n).clip(0, 20)
    usage_hours = rng.uniform(0, 50000, size=n)
    last_service_days = rng.integers(0, 365, size=n)
    fault_history = rng.integers(0, 15, size=n)

    # Derive risk_score (0-100) from features
    risk_score = (
        (temperature - 20) / 130 * 30
        + vibration / 20 * 25
        + usage_hours / 50000 * 20
        + last_service_days / 365 * 15
        + fault_history / 15 * 10
    ).clip(0, 100)

    # Add noise
    noise = rng.normal(0, 3, size=n)
    risk_score = (risk_score + noise).clip(0, 100).round(2)

    # Assign status with balanced distribution using quantile thresholds
    q33, q66 = np.percentile(risk_score, [33, 66])
    status = np.where(
        risk_score >= q66, "Critical",
        np.where(risk_score >= q33, "Warning", "Healthy")
    )

    df = pd.DataFrame({
        "temperature": temperature.round(2),
        "vibration": vibration.round(4),
        "usage_hours": usage_hours.round(1),
        "last_service_days": last_service_days,
        "fault_history": fault_history,
        "risk_score": risk_score,
        "status": status,
    })

    out_path = config["data"]["maintenance"]
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)
    logger.info("Maintenance dataset saved to %s (%d rows)", out_path, len(df))
    return df


def generate_delay_data(config: dict) -> pd.DataFrame:
    """Generate synthetic train delay prediction dataset.

    Args:
        config: Configuration dict with keys 'random_seed', 'data' (n_samples, delay path).

    Returns:
        DataFrame with columns: distance, weather, congestion_level,
        previous_delay, train_type, delay_minutes.
    """
    logger = setup_logger("data_generator", config)
    rng = np.random.default_rng(config["random_seed"] + 2)
    n = config["data"]["n_samples"]

    distance = rng.uniform(10, 2000, size=n).round(1)

    weather_options = ["clear", "rain", "fog", "storm"]
    # Realistic distribution: clear most common
    weather_probs = [0.50, 0.25, 0.15, 0.10]
    weather = rng.choice(weather_options, size=n, p=weather_probs)

    congestion_options = ["Low", "Medium", "High"]
    congestion_probs = [0.40, 0.35, 0.25]
    congestion_level = rng.choice(congestion_options, size=n, p=congestion_probs)

    previous_delay = rng.exponential(scale=10.0, size=n).clip(0, 120).round(2)

    train_types = ["express", "passenger", "freight"]
    train_type = rng.choice(train_types, size=n)

    # Weather multiplier
    weather_mult = np.where(weather == "storm", 3.0,
                   np.where(weather == "fog", 2.0,
                   np.where(weather == "rain", 1.5, 1.0)))

    # Congestion multiplier
    cong_mult = np.where(congestion_level == "High", 2.0,
                np.where(congestion_level == "Medium", 1.4, 1.0))

    # Train type base delay
    type_base = np.where(train_type == "freight", 8.0,
                np.where(train_type == "passenger", 5.0, 3.0))

    delay_minutes = (
        type_base * weather_mult * cong_mult
        + previous_delay * 0.3
        + distance / 500
        + rng.exponential(scale=3.0, size=n)
    ).clip(0).round(2)

    df = pd.DataFrame({
        "distance": distance,
        "weather": weather,
        "congestion_level": congestion_level,
        "previous_delay": previous_delay,
        "train_type": train_type,
        "delay_minutes": delay_minutes,
    })

    out_path = config["data"]["delay"]
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)
    logger.info("Delay dataset saved to %s (%d rows)", out_path, len(df))
    return df


def generate_congestion_data(config: dict) -> pd.DataFrame:
    """Generate synthetic congestion detection dataset.

    Args:
        config: Configuration dict with keys 'random_seed', 'data' (n_samples, congestion path).

    Returns:
        DataFrame with columns: train_density, station_load, time_of_day,
        route_type, congestion_level.
    """
    logger = setup_logger("data_generator", config)
    rng = np.random.default_rng(config["random_seed"] + 3)
    n = config["data"]["n_samples"]

    train_density = rng.uniform(1, 50, size=n).round(2)
    station_load = rng.uniform(100, 10000, size=n).round(1)

    time_options = ["morning", "afternoon", "evening", "night"]
    time_probs = [0.30, 0.25, 0.30, 0.15]
    time_of_day = rng.choice(time_options, size=n, p=time_probs)

    route_options = ["urban", "suburban", "intercity"]
    route_type = rng.choice(route_options, size=n)

    # Derive congestion score
    time_mult = np.where(time_of_day == "morning", 1.5,
                np.where(time_of_day == "evening", 1.5,
                np.where(time_of_day == "afternoon", 1.2, 0.8)))

    route_mult = np.where(route_type == "urban", 1.5,
                 np.where(route_type == "suburban", 1.2, 1.0))

    score = (
        train_density / 50 * 50
        + station_load / 10000 * 50
    ) * time_mult * route_mult

    # Balanced labels via quantile thresholds
    q33, q66 = np.percentile(score, [33, 66])
    congestion_level = np.where(
        score >= q66, "High",
        np.where(score >= q33, "Medium", "Low")
    )

    df = pd.DataFrame({
        "train_density": train_density,
        "station_load": station_load,
        "time_of_day": time_of_day,
        "route_type": route_type,
        "congestion_level": congestion_level,
    })

    out_path = config["data"]["congestion"]
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)
    logger.info("Congestion dataset saved to %s (%d rows)", out_path, len(df))
    return df


if __name__ == "__main__":
    cfg = load_config("configs/config.yaml")
    generate_alert_data(cfg)
    generate_maintenance_data(cfg)
    generate_delay_data(cfg)
    generate_congestion_data(cfg)
