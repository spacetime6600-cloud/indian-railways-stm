"""Unit tests for src/data_generator.py.

Tests cover:
- File existence after generation (each CSV saved to data/raw/)
- Row count in [3000, 5000]
- Correct column names for each dataset
- CSV readability (can be loaded back with pd.read_csv)

Requirements: 1.1, 1.2
"""

import os

import pandas as pd
import pytest

from src.utils import load_config
from src.data_generator import (
    generate_alert_data,
    generate_congestion_data,
    generate_delay_data,
    generate_maintenance_data,
)


@pytest.fixture(scope="module")
def config():
    return load_config("configs/config.yaml")


@pytest.fixture(scope="module")
def alert_df(config):
    return generate_alert_data(config)


@pytest.fixture(scope="module")
def maintenance_df(config):
    return generate_maintenance_data(config)


@pytest.fixture(scope="module")
def delay_df(config):
    return generate_delay_data(config)


@pytest.fixture(scope="module")
def congestion_df(config):
    return generate_congestion_data(config)


# ---------------------------------------------------------------------------
# Alert dataset
# ---------------------------------------------------------------------------

ALERT_COLUMNS = ["alert_type", "delay_impact", "safety_risk", "affected_trains",
                  "route_busy", "peak_hour", "priority"]


def test_alert_file_exists(config, alert_df):
    assert os.path.isfile(config["data"]["alert"])


def test_alert_row_count(config, alert_df):
    assert 3000 <= len(alert_df) <= 5000


def test_alert_column_names(alert_df):
    assert list(alert_df.columns) == ALERT_COLUMNS


def test_alert_csv_readable(config, alert_df):
    loaded = pd.read_csv(config["data"]["alert"])
    assert list(loaded.columns) == ALERT_COLUMNS
    assert len(loaded) == len(alert_df)


# ---------------------------------------------------------------------------
# Maintenance dataset
# ---------------------------------------------------------------------------

MAINTENANCE_COLUMNS = ["temperature", "vibration", "usage_hours",
                        "last_service_days", "fault_history", "risk_score", "status"]


def test_maintenance_file_exists(config, maintenance_df):
    assert os.path.isfile(config["data"]["maintenance"])


def test_maintenance_row_count(config, maintenance_df):
    assert 3000 <= len(maintenance_df) <= 5000


def test_maintenance_column_names(maintenance_df):
    assert list(maintenance_df.columns) == MAINTENANCE_COLUMNS


def test_maintenance_csv_readable(config, maintenance_df):
    loaded = pd.read_csv(config["data"]["maintenance"])
    assert list(loaded.columns) == MAINTENANCE_COLUMNS
    assert len(loaded) == len(maintenance_df)


# ---------------------------------------------------------------------------
# Delay dataset
# ---------------------------------------------------------------------------

DELAY_COLUMNS = ["distance", "weather", "congestion_level",
                  "previous_delay", "train_type", "delay_minutes"]


def test_delay_file_exists(config, delay_df):
    assert os.path.isfile(config["data"]["delay"])


def test_delay_row_count(config, delay_df):
    assert 3000 <= len(delay_df) <= 5000


def test_delay_column_names(delay_df):
    assert list(delay_df.columns) == DELAY_COLUMNS


def test_delay_csv_readable(config, delay_df):
    loaded = pd.read_csv(config["data"]["delay"])
    assert list(loaded.columns) == DELAY_COLUMNS
    assert len(loaded) == len(delay_df)


# ---------------------------------------------------------------------------
# Congestion dataset
# ---------------------------------------------------------------------------

CONGESTION_COLUMNS = ["train_density", "station_load", "time_of_day",
                       "route_type", "congestion_level"]


def test_congestion_file_exists(config, congestion_df):
    assert os.path.isfile(config["data"]["congestion"])


def test_congestion_row_count(config, congestion_df):
    assert 3000 <= len(congestion_df) <= 5000


def test_congestion_column_names(congestion_df):
    assert list(congestion_df.columns) == CONGESTION_COLUMNS


def test_congestion_csv_readable(config, congestion_df):
    loaded = pd.read_csv(config["data"]["congestion"])
    assert list(loaded.columns) == CONGESTION_COLUMNS
    assert len(loaded) == len(congestion_df)
