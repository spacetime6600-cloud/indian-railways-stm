"""Shared utilities for the Railways ML System: logging setup and config loading."""

import logging
import os
from logging.handlers import RotatingFileHandler

import yaml

REQUIRED_CONFIG_KEYS = ["random_seed", "data", "models", "paths", "logging"]


def setup_logger(name: str, config: dict) -> logging.Logger:
    """Create and return a logger with StreamHandler and RotatingFileHandler.

    Args:
        name: Logger name; log file will be written to logs/<name>.log.
        config: Configuration dict containing a 'logging' sub-dict with keys:
                'level' (str), 'max_bytes' (int), 'backup_count' (int).
                Also uses config['paths']['logs'] for the log directory.

    Returns:
        Configured logging.Logger instance.
    """
    log_cfg = config["logging"]
    log_dir = config.get("paths", {}).get("logs", "logs/")
    os.makedirs(log_dir, exist_ok=True)

    level = getattr(logging, log_cfg.get("level", "INFO").upper(), logging.INFO)
    max_bytes = log_cfg.get("max_bytes", 10485760)
    backup_count = log_cfg.get("backup_count", 5)

    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Avoid adding duplicate handlers if logger already configured
    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(level)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    log_file = os.path.join(log_dir, f"{name}.log")
    file_handler = RotatingFileHandler(
        log_file, maxBytes=max_bytes, backupCount=backup_count
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


def load_config(path: str) -> dict:
    """Load and validate a YAML configuration file.

    Args:
        path: Path to the YAML config file.

    Returns:
        Parsed configuration dict.

    Raises:
        KeyError: If a required top-level key is missing. The exception message
                  contains the missing key name.
        yaml.YAMLError: If the file cannot be parsed as valid YAML.
    """
    with open(path, "r") as f:
        config = yaml.safe_load(f)

    for key in REQUIRED_CONFIG_KEYS:
        if key not in config:
            raise KeyError(key)

    return config
