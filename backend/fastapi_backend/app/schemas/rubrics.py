"""
Request / response schemas for the rubrics endpoint.
"""

from __future__ import annotations

import ast
from typing import Annotated, List

from pydantic import BaseModel, Field, StringConstraints, field_validator


class RubricsRequest(BaseModel):
    """
    Request body for ``POST /api/v1/rubrics/create``.

    Attributes:
        question_id:   Unique identifier of the question.
        question_text: Full question text.
        max_marks:     Maximum marks allocated to this question (1–100).
    """

    question_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    question_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=3000)]
    max_marks: Annotated[int, Field(ge=1, le=100, description="Maximum marks for this question.")]


class RubricsResponse(BaseModel):
    """
    Response body for ``POST /api/v1/rubrics/create``.

    Attributes:
        question_id:   Echoes the request ``question_id``.
        question_text: Echoes the question text.
        rubrics:       Ordered list of marking criteria.
    """

    question_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    question_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    rubrics: List[str] = Field(..., min_length=1, description="List of marking criteria.")

    @field_validator("rubrics", mode="before")
    @classmethod
    def _validate_rubrics(cls, v) -> List[str]:
        if isinstance(v, str):
            try:
                v = ast.literal_eval(v)
            except Exception:
                v = [v]
        if isinstance(v, list):
            cleaned = [str(item).strip() for item in v if str(item).strip()]
            if not cleaned:
                raise ValueError("Rubrics must contain at least one non-empty item.")
            return cleaned
        raise TypeError("Rubrics must be a string or list of strings.")
