"""
Question generation service: bridges FastAPI route → QuestionGenerator.

Supports multi-topic generation — each topic in the request is processed
independently and results are returned as a unified dict keyed by topic.
"""

from __future__ import annotations

import logging
from typing import Dict

from ai_ml.question_generator import QuestionGenerator
from ai_ml.exceptions import QuestionsGenerationError
from app.core.state import app_state
from app.schemas.question_generation import QuestionGenerationRequest, QuestionGenerationResponse

logger = logging.getLogger(__name__)

_generator: QuestionGenerator | None = None


def _get_generator() -> QuestionGenerator:
    global _generator
    if _generator is None:
        _generator = QuestionGenerator(model=app_state.groq_model)
    return _generator


def generate_questions(payload: QuestionGenerationRequest) -> QuestionGenerationResponse:
    """
    Generate questions for one or more topics.

    Each topic is processed independently.  If a single topic fails, the
    error is logged and that topic's entry will contain an ``error`` key
    rather than ``questions`` — so other topics still succeed.

    Args:
        payload: Request containing topic list, question count, and difficulty.

    Returns:
        :class:`QuestionGenerationResponse` mapping topic → question dict.
    """
    generator = _get_generator()
    results: Dict[str, dict] = {}

    for topic in payload.topics:
        logger.info(
            "Generating %d '%s' questions for topic: %s",
            payload.num_questions,
            payload.difficulty,
            topic,
        )
        try:
            questions = generator.generate(
                topic=topic,
                num_questions=payload.num_questions,
                difficulty=payload.difficulty,
            )
            results[topic] = {
                str(idx + 1): question for idx, question in enumerate(questions)
            }
        except QuestionsGenerationError as exc:
            logger.error("Question generation failed for topic '%s': %s", topic, exc)
            results[topic] = {"error": str(exc)}

    return QuestionGenerationResponse(topics=results)
