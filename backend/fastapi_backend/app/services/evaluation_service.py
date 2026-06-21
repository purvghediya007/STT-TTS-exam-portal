"""
Evaluation service: bridges FastAPI route → EvaluationEngine.
"""

from __future__ import annotations

import logging

from ai_ml.evaluation import EvaluationEngine
from app.core.state import app_state
from app.schemas.evaluation import EvaluateAnswer, EvaluateAnswerResponse

logger = logging.getLogger(__name__)

# Module-level engine instance (uses the preloaded Groq model from startup)
_engine: EvaluationEngine | None = None


def _get_engine() -> EvaluationEngine:
    global _engine
    if _engine is None:
        _engine = EvaluationEngine(model=app_state.groq_model)
    return _engine


def evaluate_answer(payload: EvaluateAnswer) -> EvaluateAnswerResponse:
    """
    Evaluate a single student answer.

    Args:
        payload: Validated request containing question, answer, rubric,
                 and maximum marks.

    Returns:
        :class:`EvaluateAnswerResponse` with score and feedback.

    Raises:
        EvaluationError: Propagated from :class:`EvaluationEngine`.
    """
    engine = _get_engine()

    logger.info(
        "Evaluating answer for question_id=%s (max_marks=%s)",
        payload.question_id,
        payload.max_marks,
    )

    result = engine.evaluate(
        question_text=payload.question_text,
        student_answer=payload.student_answer,
        rubrics=payload.rubrics,
        max_marks=payload.max_marks,
    )

    return EvaluateAnswerResponse(
        question_id=payload.question_id,
        **result.model_dump(),
    )
