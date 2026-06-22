"""
Question generation router.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.question_generation import QuestionGenerationRequest, QuestionGenerationResponse
from app.services.question_generation_service import generate_questions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/questions", tags=["Question Generation"])


@router.post(
    "/generate",
    response_model=QuestionGenerationResponse,
    summary="Generate exam questions",
    description=(
        "Generate theory-based exam questions for one or more topics. "
        "Questions are verbally answerable (no code or algorithms). "
        "If generation fails for a specific topic, that topic's entry "
        "will contain an 'error' key and other topics will still be returned."
    ),
)
async def generate_questions_endpoint(payload: QuestionGenerationRequest) -> QuestionGenerationResponse:
    """
    Generate exam questions for a list of topics.

    Each topic is processed independently.  Results are keyed by topic name.
    """
    try:
        result = generate_questions(payload)
    except Exception:
        logger.exception("Unexpected error during question generation")
        raise HTTPException(status_code=500, detail="Question generation failed due to an internal error.")

    if not result.topics:
        raise HTTPException(status_code=400, detail="No questions could be generated for the provided topics.")

    return result
