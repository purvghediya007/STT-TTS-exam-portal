"""
MCQ (Multiple Choice Question) evaluation engine.

Uses sentence-transformer cosine similarity to determine whether a
student's selected option matches the correct option.  Falls back
to label-only matching for simple A/B/C/D answers.
"""

from __future__ import annotations

import logging
import re
from typing import Literal

from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, util

from app.config import settings

logger = logging.getLogger(__name__)


# Output schema

class MCQResult(BaseModel):
    """Result of a single MCQ evaluation."""

    question_id: str = Field(min_length=1)
    similarity_score: float = Field(ge=0.0, le=1.0)
    inference: Literal["Correct Answer", "Incorrect Answer"]


# Engine

class MCQEvaluationEngine:
    """
    Evaluates MCQ responses using semantic similarity.

    Strategy:
      1. Extract option labels (a/b/c/d).  If labels match → correct.
      2. Encode both options with SentenceTransformer and compute cosine
         similarity.  Score ≥ threshold → correct.

    Args:
        model:     Pre-loaded SentenceTransformer instance (optional).
        threshold: Cosine similarity threshold for a "correct" answer.
    """

    def __init__(
        self,
        model: SentenceTransformer | None = None,
        threshold: float | None = None,
    ) -> None:
        self._model = model
        self.threshold = threshold if threshold is not None else settings.MCQ_SIMILARITY_THRESHOLD

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            logger.info("Loading SentenceTransformer '%s' …", settings.MCQ_EVAL_MODEL_NAME)
            self._model = SentenceTransformer(settings.MCQ_EVAL_MODEL_NAME)
        return self._model

    @staticmethod
    def _extract_label(text: str) -> str:
        """Extract a single option label (a/b/c/d) from option text."""
        if not text:
            return ""
        match = re.search(r"\b(?:option|answer|ans)?\s*([abcd])\b", text.lower())
        return match.group(1) if match else ""

    def evaluate(self, *, question_id: str, correct_option: str, selected_option: str) -> MCQResult:
        """
        Evaluate a student's MCQ answer.

        Args:
            question_id:     Identifier for the question.
            correct_option:  The correct answer string.
            selected_option: The student's selected answer string.

        Returns:
            :class:`MCQResult` with similarity score and inference.

        Raises:
            ValueError: If inputs are invalid.
        """
        if not correct_option or not selected_option:
            raise ValueError("correct_option and selected_option must be non-empty strings.")

        correct_label = self._extract_label(correct_option)
        selected_label = self._extract_label(selected_option)

        # Fast path: label match
        if correct_label and selected_label:
            match = correct_label == selected_label
            logger.debug(
                "MCQ label comparison: '%s' vs '%s' → %s",
                correct_label,
                selected_label,
                "correct" if match else "incorrect",
            )
            return MCQResult(
                question_id=question_id,
                similarity_score=1.0 if match else 0.0,
                inference="Correct Answer" if match else "Incorrect Answer",
            )

        # Semantic similarity path
        model = self._get_model()
        emb_correct = model.encode(correct_option)
        emb_selected = model.encode(selected_option)
        score: float = util.cos_sim(emb_correct, emb_selected).item()

        is_correct = score >= self.threshold
        logger.debug(
            "MCQ semantic score: %.4f (threshold %.2f) → %s",
            score,
            self.threshold,
            "correct" if is_correct else "incorrect",
        )

        return MCQResult(
            question_id=question_id,
            similarity_score=round(score, 4),
            inference="Correct Answer" if is_correct else "Incorrect Answer",
        )
