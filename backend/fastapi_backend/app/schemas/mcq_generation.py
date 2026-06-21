"""
Request / response schemas for the MCQ generation endpoint.
"""

from __future__ import annotations

from typing import Dict, List, Literal, Any, Union

from pydantic import BaseModel, Field


class MCQItem(BaseModel):
    """
    Represents a single Multiple Choice Question.
    """
    question: str = Field(..., description="The generated question text.")
    options: List[str] = Field(
        ...,
        min_items=4,
        max_items=4,
        description="The 4 options for the MCQ, prefixed with A:, B:, C:, D:."
    )
    correct_option: str = Field(..., description="The exact string of the correct option.")


class MCQGenerationRequest(BaseModel):
    """
    Request body for ``POST /api/v1/mcqs/generate``.

    Attributes:
        topics:        One or more topics for which to generate MCQs.
        num_questions: Number of MCQs to generate per topic (1–100).
        difficulty:    Desired difficulty level.
    """

    topics: List[str] = Field(
        ...,
        min_length=1,
        description="List of topics to generate MCQs for.",
    )
    num_questions: int = Field(
        ...,
        ge=1,
        le=100,
        description="Number of MCQs to generate per topic.",
    )
    difficulty: Literal["easy", "medium", "hard"] = Field(
        ...,
        description="Question difficulty level.",
    )


class MCQGenerationResponse(BaseModel):
    """
    Response body for ``POST /api/v1/mcqs/generate``.

    ``topics`` maps each topic name to a list of ``MCQItem``s.
    On error for a specific topic, the list might be empty, or you might receive
    an error dictionary instead if handled specifically (we will return a dict with "error" key).

    Example::

        {
          "topics": {
            "Binary Trees": [
              {
                "question": "What is a binary search tree?",
                "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
                "correct_option": "A: ..."
              }
            ]
          }
        }
    """

    topics: Dict[str, Union[List[MCQItem], Dict[str, str]]]
