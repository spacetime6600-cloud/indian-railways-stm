"""Structured observability — logs prediction inputs, outputs, and latency."""

from __future__ import annotations

import logging
import time
from typing import Any

_obs_logger = logging.getLogger("observability")


def log_prediction(
    endpoint: str,
    input_data: dict,
    result: dict,
    latency_ms: float,
    confidence: float | None = None,
) -> None:
    """Emit a structured log line for every prediction.

    Args:
        endpoint: Route name, e.g. "predict-alert".
        input_data: Raw request dict.
        result: Prediction output dict.
        latency_ms: Wall-clock time for the prediction in milliseconds.
        confidence: Optional model confidence score.
    """
    _obs_logger.info(
        "PREDICTION endpoint=%s latency_ms=%.2f confidence=%s input=%s output=%s",
        endpoint,
        latency_ms,
        f"{confidence:.4f}" if confidence is not None else "n/a",
        input_data,
        result,
    )


class Timer:
    """Context manager that measures elapsed wall-clock time in milliseconds."""

    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *_):
        self.elapsed_ms = (time.perf_counter() - self._start) * 1000

    @property
    def ms(self) -> float:
        return getattr(self, "elapsed_ms", 0.0)
