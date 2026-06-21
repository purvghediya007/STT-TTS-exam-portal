"""
Rubric generation router.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ai_ml.exceptions import RubricsGenerationError
from app.schemas.rubrics import RubricsRequest, RubricsResponse
from app.services.rubrics_service import generate_rubrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rubrics", tags=["Rubrics"])


@router.post(
    "/create",
    response_model=RubricsResponse,
    summary="Generate marking rubrics for a question",
    description=(
        "Given a question and its maximum marks, generate a list of "
        "marking criteria (rubrics) that an evaluator should check."
    ),
)
async def create_rubrics_endpoint(payload: RubricsRequest) -> RubricsResponse:
    """Generate rubrics for a single exam question."""
    try:
        return generate_rubrics(payload)
    except RubricsGenerationError as exc:
        logger.error("Rubrics generation error for question_id=%s: %s", payload.question_id, exc)
        raise HTTPException(status_code=500, detail=f"Rubric generation failed: {exc}")
    except Exception:
        logger.exception("Unexpected rubrics error for question_id=%s", payload.question_id)
        raise HTTPException(status_code=500, detail="Rubric generation failed due to an internal error.")
