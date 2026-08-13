"""Non-blocking usage telemetry hook.

The service currently has no Mongo client in this repository, so this emits a
stable structured log record. Deployments can route these records to the
existing observability/Mongo sink without coupling request paths to storage.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.config import settings

logger = logging.getLogger("examecho.usage")


def log_usage(*, provider: str, task: str, model: str, prompt_tokens=None,
              completion_tokens=None, cached_tokens=None, audio_seconds=None) -> None:
    if not settings.ENABLE_USAGE_LOGGING:
        return
    try:
        logger.info("usage_log=%s", {
            "provider": provider, "task": task, "model": model,
            "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
            "cached_tokens": cached_tokens, "audio_seconds": audio_seconds,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:  # telemetry must never affect a request
        logger.exception("Could not write usage telemetry")
