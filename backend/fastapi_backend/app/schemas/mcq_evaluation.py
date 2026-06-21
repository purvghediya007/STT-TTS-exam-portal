"""
Request / response schemas for the MCQ evaluation endpoint.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints


class MCQEvaluation(BaseModel):
    """
    Request body for ``POST /api/v1/mcq/evaluate``.

    Attributes:
        question_id:     Unique identifier of the MCQ question.
        selected_option: The answer option chosen by the student.
        correct_option:  The correct answer option.
    """

    question_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    selected_option: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, to_lower=True)]
    correct_option: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, to_lower=True)]


class MCQEvaluationResponse(BaseModel):
    """
    Response body for ``POST /api/v1/mcq/evaluate``.

    Attributes:
        question_id:      Echoes the request ``question_id``.
        similarity_score: Cosine similarity between selected and correct options (0–1).
        inference:        ``"Correct Answer"`` or ``"Incorrect Answer"``.
    """

    question_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    similarity_score: float = Field(ge=0.0, le=1.0, description="Cosine similarity score (0–1).")
    inference: Literal["Correct Answer", "Incorrect Answer"]
