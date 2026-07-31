"""
Viva / long-answer evaluation engine.

Sends the student's answer to Groq (llama-3.3-70b-versatile) with a
rubric and returns a structured :class:`EvalResult` containing score,
strengths, weaknesses, justification, and improvement suggestions.
"""

from __future__ import annotations

import logging
from typing import List

from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, field_validator

from ai_ml.exceptions import EvaluationError
from ai_ml.model_creator import GroqModelLoader
from app.utils.json_utils import extract_json

logger = logging.getLogger(__name__)


# Pydantic schema for LLM output

class EvalResult(BaseModel):
    """Validated structure for a single evaluation response."""

    score: int
    strengths: List[str]
    weakness: List[str]
    justification: str
    suggested_improvement: str

    @field_validator("score", mode="before")
    @classmethod
    def _coerce_score(cls, v) -> int:
        """Accept float scores from the LLM and round to int."""
        try:
            return int(round(float(v)))
        except (TypeError, ValueError) as exc:
            raise ValueError(f"score must be numeric, got {v!r}") from exc

    @field_validator("strengths", "weakness", mode="before")
    @classmethod
    def _ensure_list(cls, v) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v]
        return [str(item) for item in v]


# Evaluation engine

_EVAL_TEMPLATE = """\
You are a strict academic exam evaluator. You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no text before or after the JSON.

Evaluation Rules:
- Score the student answer against the rubric criteria.
- If the student answer is "I don't know", blank, or completely off-topic, score MUST be 0.
- score must be an integer between 0 and {max_marks}.
- strengths and weakness must each be a JSON array of strings (can be empty arrays).
- justification and suggested_improvement must be plain strings.

Rubric:
{rubrics}

Question:
{question_text}

Student Answer:
{student_answer}

Maximum Marks: {max_marks}

Return ONLY this JSON (no markdown, no extra text):
{{
  "score": 0,
  "strengths": [],
  "weakness": [],
  "justification": "",
  "suggested_improvement": ""
}}"""


class EvaluationEngine:
    """
    Evaluates a student's answer using Groq with a provided rubric.

    Args:
        model: Pre-loaded ChatGroq instance. If ``None``, the engine uses
               the singleton loader on first use.
    """

    def __init__(self, model=None) -> None:
        self._model = model

    def _get_model(self):
        if self._model is None:
            self._model = GroqModelLoader.get_model()
        return self._model

    def _build_chain(self):
        prompt = PromptTemplate(
            template=_EVAL_TEMPLATE,
            input_variables=["rubrics", "question_text", "student_answer", "max_marks"],
        )
        return prompt | self._get_model()

    def evaluate(
        self,
        *,
        question_text: str,
        student_answer: str,
        rubrics: List[str],
        max_marks: float,
    ) -> EvalResult:
        """
        Evaluate a student answer against a rubric.

        Args:
            question_text:  The exam question being answered.
            student_answer: The student's verbatim answer.
            rubrics:         List of marking criteria.
            max_marks:      Maximum marks available for this question.

        Returns:
            :class:`EvalResult` with score, feedback, and suggestions.

        Raises:
            EvaluationError: If the Groq call or JSON parsing fails.
        """
        rubrics_text = "\n".join(f"- {r}" for r in rubrics)

        try:
            chain = self._build_chain()
            raw = chain.invoke({
                "rubrics": rubrics_text,
                "question_text": question_text,
                "student_answer": student_answer,
                "max_marks": int(max_marks),
            })
        except Exception as exc:
            logger.error("Groq call failed during evaluation: %s", exc)
            raise EvaluationError(f"LLM call failed: {exc}") from exc

        content = raw.content if hasattr(raw, "content") else str(raw)
        logger.debug("Evaluation raw output (%d chars)", len(content))

        try:
            data = extract_json(content)
            result = EvalResult(**data)
        except Exception as exc:
            logger.error(
                "Failed to parse evaluation response. Raw output (first 500 chars): %s",
                content[:500],
            )
            raise EvaluationError(
                f"Could not parse evaluation response: {exc}"
            ) from exc

        # Clamp score to valid range
        result = result.model_copy(
            update={"score": max(0, min(result.score, int(max_marks)))}
        )
        return result
