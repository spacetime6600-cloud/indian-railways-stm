"""Unit tests for src/utils.py config loader."""

import os
import tempfile

import pytest
import yaml

from src.utils import load_config, REQUIRED_CONFIG_KEYS

VALID_CONFIG = {
    "random_seed": 42,
    "data": {"alert": "data/raw/alert_data.csv"},
    "models": {"alert": {"rf_n_estimators": 100}},
    "paths": {"models": "models/", "logs": "logs/"},
    "logging": {"level": "INFO", "max_bytes": 10485760, "backup_count": 5},
}


def _write_config(data: dict) -> str:
    """Write a config dict to a temp YAML file and return the path."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.dump(data, f)
        return f.name


def test_load_config_returns_correct_values():
    path = _write_config(VALID_CONFIG)
    try:
        cfg = load_config(path)
        assert cfg["random_seed"] == 42
        assert cfg["logging"]["level"] == "INFO"
        assert cfg["paths"]["models"] == "models/"
    finally:
        os.unlink(path)


def test_load_config_all_required_keys_present():
    path = _write_config(VALID_CONFIG)
    try:
        cfg = load_config(path)
        for key in REQUIRED_CONFIG_KEYS:
            assert key in cfg
    finally:
        os.unlink(path)


@pytest.mark.parametrize("missing_key", REQUIRED_CONFIG_KEYS)
def test_load_config_raises_key_error_for_missing_key(missing_key):
    """load_config must raise KeyError naming the missing key."""
    data = {k: v for k, v in VALID_CONFIG.items() if k != missing_key}
    path = _write_config(data)
    try:
        with pytest.raises(KeyError) as exc_info:
            load_config(path)
        assert missing_key in str(exc_info.value), (
            f"KeyError message should contain '{missing_key}', got: {exc_info.value}"
        )
    finally:
        os.unlink(path)
