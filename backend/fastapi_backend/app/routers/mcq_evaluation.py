"""
MCQ evaluation router.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.mcq_evaluation import MCQEvaluation, MCQEvaluationResponse
from app.services.mcq_evaluation_service import evaluate_mcq

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcq", tags=["MCQ Evaluation"])


@router.post(
    "/evaluate",
    response_model=MCQEvaluationResponse,
    summary="Evaluate an MCQ answer",
    description=(
        "Compare a student's selected MCQ option against the correct option "
        "using label matching and semantic (cosine) similarity. "
        "Returns a similarity score and a 'Correct / Incorrect' inference."
    ),
)
async def evaluate_mcq_endpoint(payload: MCQEvaluation) -> MCQEvaluationResponse:
    """Evaluate a multiple-choice question answer."""
    try:
        return evaluate_mcq(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Unexpected MCQ evaluation error for question_id=%s", payload.question_id)
        raise HTTPException(status_code=500, detail="MCQ evaluation failed due to an internal error.")
