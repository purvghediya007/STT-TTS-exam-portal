"""
Rubrics service: bridges FastAPI route → RubricsEngine.
"""

from __future__ import annotations

import logging

from ai_ml.rubrics import RubricsEngine
from app.core.state import app_state
from app.schemas.rubrics import RubricsRequest, RubricsResponse

logger = logging.getLogger(__name__)

_engine: RubricsEngine | None = None


def _get_engine() -> RubricsEngine:
    global _engine
    if _engine is None:
        _engine = RubricsEngine(model=app_state.groq_model)
    return _engine


def generate_rubrics(payload: RubricsRequest) -> RubricsResponse:
    """
    Generate marking rubrics for a question.

    Args:
        payload: Validated request with question text and max marks.

    Returns:
        :class:`RubricsResponse` with the generated rubric list.

    Raises:
        RubricsGenerationError: Propagated from :class:`RubricsEngine`.
    """
    engine = _get_engine()

    logger.info(
        "Generating rubrics for question_id=%s (max_marks=%s)",
        payload.question_id,
        payload.max_marks,
    )

    result = engine.generate(
        question_text=payload.question_text,
        max_marks=payload.max_marks,
    )

    return RubricsResponse(
        question_id=payload.question_id,
        question_text=result.question_text,
        rubrics=result.rubrics,
    )
