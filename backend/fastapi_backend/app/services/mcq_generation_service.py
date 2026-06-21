"""
MCQ generation service: bridges FastAPI route → MCQGenerator.

Supports multi-topic generation — each topic in the request is processed
independently and results are returned as a unified dict keyed by topic.
"""

from __future__ import annotations

import logging
from typing import Dict, Union, List

from ai_ml.mcq_generator import MCQGenerator
from ai_ml.exceptions import QuestionsGenerationError
from app.core.state import app_state
from app.schemas.mcq_generation import MCQGenerationRequest, MCQGenerationResponse, MCQItem

logger = logging.getLogger(__name__)

_generator: MCQGenerator | None = None


def _get_generator() -> MCQGenerator:
    global _generator
    if _generator is None:
        _generator = MCQGenerator(model=app_state.groq_model)
    return _generator


def generate_mcqs(payload: MCQGenerationRequest) -> MCQGenerationResponse:
    """
    Generate MCQs for one or more topics.

    Each topic is processed independently. If a single topic fails, the
    error is logged and that topic's entry will contain an ``error`` key
    rather than a list of MCQs — so other topics still succeed.

    Args:
        payload: Request containing topic list, question count, and difficulty.

    Returns:
        :class:`MCQGenerationResponse` mapping topic → list of MCQItems or error dict.
    """
    generator = _get_generator()
    results: Dict[str, Union[List[MCQItem], Dict[str, str]]] = {}

    for topic in payload.topics:
        logger.info(
            "Generating %d '%s' MCQs for topic: %s",
            payload.num_questions,
            payload.difficulty,
            topic,
        )
        try:
            raw_mcqs = generator.generate(
                topic=topic,
                num_questions=payload.num_questions,
                difficulty=payload.difficulty,
            )
            
            mcq_items = []
            for mcq_dict in raw_mcqs:
                mcq_items.append(MCQItem(**mcq_dict))
                
            results[topic] = mcq_items
            
        except QuestionsGenerationError as exc:
            logger.error("MCQ generation failed for topic '%s': %s", topic, exc)
            results[topic] = {"error": str(exc)}

    return MCQGenerationResponse(topics=results)
