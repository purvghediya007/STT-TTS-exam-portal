"""
Request / response schemas for the question generation endpoint.
"""

from __future__ import annotations

from typing import Dict, List, Literal

from pydantic import BaseModel, Field


class QuestionGenerationRequest(BaseModel):
    """
    Request body for ``POST /api/v1/questions/generate``.

    Attributes:
        topics:        One or more topics for which to generate questions.
        num_questions: Number of questions to generate per topic (1–100).
        difficulty:    Desired difficulty level.
    """

    topics: List[str] = Field(
        ...,
        min_length=1,
        description="List of topics to generate questions for.",
    )
    num_questions: int = Field(
        ...,
        ge=1,
        le=100,
        description="Number of questions to generate per topic.",
    )
    difficulty: Literal["easy", "medium", "hard"] = Field(
        ...,
        description="Question difficulty level.",
    )


class QuestionGenerationResponse(BaseModel):
    """
    Response body for ``POST /api/v1/questions/generate``.

    ``topics`` maps each topic name to a dict of ``{index: question_text}``.
    On error for a specific topic, the dict contains ``{"error": "<message>"}``.

    Example::

        {
          "topics": {
            "Binary Trees": {
              "1": "What is a binary search tree?",
              "2": "Explain the difference between BFS and DFS."
            }
          }
        }
    """

    topics: Dict[str, Dict[str, str]]
