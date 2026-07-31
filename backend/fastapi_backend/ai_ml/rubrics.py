"""
Rubric generation engine.

Given a question and its maximum marks, uses Groq (llama-3.3-70b-versatile)
to produce a list of marking criteria (rubrics) that an evaluator should
check when scoring a student's answer.
"""

from __future__ import annotations

import logging
from typing import List

from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field, field_validator

from ai_ml.exceptions import RubricsGenerationError
from ai_ml.model_creator import GroqModelLoader
from app.utils.json_utils import extract_json

logger = logging.getLogger(__name__)


# Output schema

class RubricsResult(BaseModel):
    """Validated rubric list for a single question."""

    question_text: str = Field(min_length=1)
    rubrics: List[str] = Field(min_length=1)

    @field_validator("rubrics", mode="before")
    @classmethod
    def _ensure_list(cls, v) -> List[str]:
        if isinstance(v, str):
            return [v]
        cleaned = [str(item).strip() for item in v if str(item).strip()]
        if not cleaned:
            raise ValueError("Rubrics must contain at least one non-empty item.")
        return cleaned


# Prompt

_RUBRICS_TEMPLATE = """\
You are an academic exam evaluator. You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no text before or after the JSON.

Task:
Generate marking rubrics for the question below.

Rules:
- Each rubric item must be a clear, distinct evaluative criterion (a single sentence).
- Generate approximately one rubric per 2–3 marks (e.g. 10 marks → 4–5 rubrics).
- Rubrics must be specific enough to guide a human marker.
- Do NOT include generic rubrics like "Good effort" or "Clear writing".

Return ONLY this JSON (no markdown, no extra text):
{{
  "question_text": "{question_text}",
  "rubrics": ["criterion 1", "criterion 2", "criterion 3"]
}}

Question:
{question_text}

Total Marks: {max_marks}"""


class RubricsEngine:
    """
    Generates marking rubrics for a given question using Groq.

    Args:
        model: Pre-loaded ChatGroq instance (optional; lazy-loaded if omitted).
    """

    def __init__(self, model=None) -> None:
        self._model = model

    def _get_model(self):
        if self._model is None:
            self._model = GroqModelLoader.get_model()
        return self._model

    def _build_chain(self):
        prompt = PromptTemplate(
            template=_RUBRICS_TEMPLATE,
            input_variables=["question_text", "max_marks"],
        )
        return prompt | self._get_model()

    def generate(self, *, question_text: str, max_marks: int) -> RubricsResult:
        """
        Generate rubrics for a question.

        Args:
            question_text: The exam question.
            max_marks:     The maximum marks allocated to this question.

        Returns:
            :class:`RubricsResult` with validated rubric list.

        Raises:
            RubricsGenerationError: If the Groq call or response parsing fails.
        """
        try:
            chain = self._build_chain()
            raw = chain.invoke({"question_text": question_text, "max_marks": max_marks})
        except Exception as exc:
            logger.error("Groq call failed during rubric generation: %s", exc)
            raise RubricsGenerationError(f"LLM call failed: {exc}") from exc

        content = raw.content if hasattr(raw, "content") else str(raw)
        logger.debug("Rubrics raw output (%d chars)", len(content))

        try:
            data = extract_json(content)
            # Ensure question_text is echoed correctly (model may paraphrase it)
            if "question_text" not in data or not data["question_text"]:
                data["question_text"] = question_text
            return RubricsResult(**data)
        except Exception as exc:
            logger.error(
                "Failed to parse rubrics response. Raw output (first 500 chars): %s",
                content[:500],
            )
            raise RubricsGenerationError(
                f"Could not parse rubrics response: {exc}"
            ) from exc
