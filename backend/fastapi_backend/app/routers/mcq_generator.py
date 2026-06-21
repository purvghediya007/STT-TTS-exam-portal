"""
MCQ generation router.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.mcq_generation import MCQGenerationRequest, MCQGenerationResponse
from app.services.mcq_generation_service import generate_mcqs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcqs", tags=["MCQ Generation"])


@router.post(
    "/generate",
    response_model=MCQGenerationResponse,
    summary="Generate Multiple Choice Questions",
    description=(
        "Generate Multiple Choice Questions for one or more topics. "
        "Questions come with 4 options and a correct option. "
        "If generation fails for a specific topic, that topic's entry "
        "will contain an 'error' key and other topics will still be returned."
    ),
)
async def generate_mcqs_endpoint(payload: MCQGenerationRequest) -> MCQGenerationResponse:
    """
    Generate MCQs for a list of topics.

    Each topic is processed independently. Results are keyed by topic name.
    """
    try:
        result = generate_mcqs(payload)
    except Exception:
        logger.exception("Unexpected error during MCQ generation")
        raise HTTPException(status_code=500, detail="MCQ generation failed due to an internal error.")

    if not result.topics:
        raise HTTPException(status_code=400, detail="No MCQs could be generated for the provided topics.")

    return result
