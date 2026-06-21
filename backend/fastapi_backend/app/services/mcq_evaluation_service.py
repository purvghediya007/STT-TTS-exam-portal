"""
MCQ evaluation service: bridges FastAPI route → MCQEvaluationEngine.
"""

from __future__ import annotations

import logging

from ai_ml.mcq_evaluation import MCQEvaluationEngine
from app.core.state import app_state
from app.schemas.mcq_evaluation import MCQEvaluation, MCQEvaluationResponse

logger = logging.getLogger(__name__)

_engine: MCQEvaluationEngine | None = None


def _get_engine() -> MCQEvaluationEngine:
    global _engine
    if _engine is None:
        # Use the preloaded sentence-transformer model if available
        _engine = MCQEvaluationEngine(model=app_state.st_model)
    return _engine


def evaluate_mcq(payload: MCQEvaluation) -> MCQEvaluationResponse:
    """
    Evaluate a student's MCQ selection.

    Args:
        payload: Validated request with question ID and answer options.

    Returns:
        :class:`MCQEvaluationResponse` with similarity score and inference.

    Raises:
        ValueError: Propagated from :class:`MCQEvaluationEngine` for invalid inputs.
    """
    engine = _get_engine()

    logger.info("Evaluating MCQ for question_id=%s", payload.question_id)

    result = engine.evaluate(
        question_id=payload.question_id,
        correct_option=payload.correct_option,
        selected_option=payload.selected_option,
    )

    return MCQEvaluationResponse(**result.model_dump())
