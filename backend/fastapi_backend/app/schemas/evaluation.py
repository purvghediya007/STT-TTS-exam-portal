"""
Request / response schemas for the evaluation endpoint.
"""

from __future__ import annotations

from typing import Annotated, List

from pydantic import BaseModel, Field, StringConstraints, field_validator


class EvaluateAnswer(BaseModel):
    """
    Request body for ``POST /api/v1/evaluate/answer``.

    Attributes:
        question_id:    Unique identifier of the question being evaluated.
        question_text:  Full text of the question.
        student_answer: The student's verbatim answer (text or STT output).
        rubric:         List of marking criteria used to evaluate the answer.
        max_marks:      Maximum marks available for this question (1–100).
    """

    question_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    question_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=3000)]
    student_answer: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=8000)]
    rubrics: List[str] = Field(..., min_length=1, description="One or more marking criteria.")
    max_marks: Annotated[float, Field(ge=1, le=100, description="Maximum marks for this question.")] = 10

    @field_validator("rubrics", mode="before")
    @classmethod
    def _validate_rubrics(cls, v) -> List[str]:
        if isinstance(v, str):
            v = [v]
        if isinstance(v, list):
            cleaned = [str(item).strip() for item in v if str(item).strip()]
            if not cleaned:
                raise ValueError("Rubrics must contain at least one non-empty item.")
            return cleaned
        raise TypeError("Rubrics must be a string or list of strings.")


class EvaluateAnswerResponse(BaseModel):
    """
    Response body for ``POST /api/v1/evaluate/answer``.

    Attributes:
        question_id:          Echoes the request ``question_id``.
        score:                Marks awarded (0 – max_marks, rounded to int).
        strengths:            List of things the student did well.
        weakness:             List of gaps or errors in the answer.
        justification:        Brief explanation of the score.
        suggested_improvement: Actionable advice for the student.
    """

    question_id: str
    score: int = Field(ge=0, le=100)
    strengths: List[str]
    weakness: List[str]
    justification: str
    suggested_improvement: str

    @field_validator("strengths", "weakness", mode="before")
    @classmethod
    def _ensure_list(cls, v) -> List[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(item) for item in v]
        return [str(v)]
