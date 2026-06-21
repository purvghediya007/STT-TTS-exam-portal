"""
Question generation engine for ExamEcho.

Generates theory-based exam questions for a given topic and difficulty
using Groq (llama-3.3-70b-versatile).
Questions are verbally answerable (no code/algorithms).
"""

from __future__ import annotations

import json
import logging
import re
from typing import List

from langchain_core.prompts import PromptTemplate

from ai_ml.exceptions import ChainCreationError, QuestionsGenerationError
from ai_ml.model_creator import GroqModelLoader

logger = logging.getLogger(__name__)


_QUESTION_TEMPLATE = """\
You are an academic exam question setter. You MUST respond with ONLY a valid JSON object.
No explanation, no markdown, no preamble.

Task:
Generate EXACTLY {num_questions} theory-based exam questions for the given TOPIC.

General Rules:
- Questions must be verbally answerable.
- NO code, NO programs, NO algorithms.
- Language must be clear and exam-appropriate.
- Stay strictly within the TOPIC.
- Each question must be a complete sentence ending with a question mark.

Difficulty Guidelines:
  EASY   → definitions, meanings, purposes
  MEDIUM → explanations, reasoning, simple examples
  HARD   → critical thinking, limitations, trade-offs, applications

Output Rules (MANDATORY):
- Return ONLY valid JSON — no markdown, no comments, no extra text before or after.
- "questions" MUST be a JSON array of exactly {num_questions} strings.

Required JSON format (copy this structure exactly):
{{
  "topic": "{topic}",
  "questions": ["<question 1>", "<question 2>"]
}}

TOPIC: {topic}
DIFFICULTY: {difficulty}"""


class QuestionGenerator:
    """
    Generates theory exam questions using Groq.

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
        try:
            prompt = PromptTemplate(
                template=_QUESTION_TEMPLATE,
                input_variables=["num_questions", "topic", "difficulty"],
            )
            return prompt | self._get_model()
        except Exception as exc:
            raise ChainCreationError(
                f"Could not build question generation chain: {exc}"
            ) from exc

    @staticmethod
    def _sanitize_json(text: str) -> str:
        """
        Strip markdown fences and extract the first valid JSON object
        from raw model output.

        Args:
            text: Raw string from the LLM.

        Returns:
            JSON string ready for ``json.loads``.

        Raises:
            ValueError: If no valid JSON object is found after cleaning.
        """
        text = re.sub(r"```(?:json)?", "", text)
        text = text.replace("```", "").strip()

        decoder = json.JSONDecoder()
        for i, ch in enumerate(text):
            if ch == "{":
                try:
                    obj, _ = decoder.raw_decode(text[i:])
                    return json.dumps(obj)
                except json.JSONDecodeError:
                    continue
        raise ValueError("No valid JSON object found in model output.")

    @staticmethod
    def _normalize_questions(raw_questions: list, num_questions: int) -> List[str]:
        """Strip optional numbering prefixes and filter empty strings."""
        normalized = []
        for q in raw_questions:
            if isinstance(q, str):
                # Remove leading "1. ", "1) ", etc.
                q = re.sub(r"^\s*\d+[.)]\s*", "", q).strip()
                if q:
                    normalized.append(q)
        return normalized[:num_questions]

    def generate(self, *, topic: str, num_questions: int, difficulty: str) -> List[str]:
        """
        Generate exam questions for a topic.

        Args:
            topic:         Subject topic (e.g. "Binary Trees").
            num_questions: Number of questions to generate (1–100).
            difficulty:    One of ``"easy"``, ``"medium"``, ``"hard"``.

        Returns:
            List of question strings (length == ``num_questions``).

        Raises:
            ChainCreationError:      If the LangChain chain cannot be built.
            QuestionsGenerationError: If generation fails or returns fewer
                                      questions than requested.
        """
        logger.debug(
            "Generating %d '%s' questions for topic: %s",
            num_questions,
            difficulty,
            topic,
        )

        try:
            chain = self._build_chain()
            raw = chain.invoke({
                "topic": topic,
                "num_questions": num_questions,
                "difficulty": difficulty,
            })
        except ChainCreationError:
            raise
        except Exception as exc:
            raise QuestionsGenerationError(f"Groq call failed: {exc}") from exc

        content = raw.content if hasattr(raw, "content") else str(raw)

        try:
            cleaned = self._sanitize_json(content)
            data = json.loads(cleaned)
        except (ValueError, json.JSONDecodeError) as exc:
            logger.error("Failed to parse questions JSON. Raw output (first 500 chars): %s", content[:500])
            raise QuestionsGenerationError(
                f"Invalid JSON from model. Original error: {exc}"
            ) from exc

        raw_list = data.get("questions", [])
        if not isinstance(raw_list, list):
            raise QuestionsGenerationError("'questions' field is not a list in model response.")

        questions = self._normalize_questions(raw_list, num_questions)

        if not questions:
            raise QuestionsGenerationError("Model returned an empty questions list.")

        if len(questions) < num_questions:
            logger.warning(
                "Expected %d questions but received %d for topic '%s'.",
                num_questions,
                len(questions),
                topic,
            )
            raise QuestionsGenerationError(
                f"Expected {num_questions} questions but received only {len(questions)}. "
                "Try reducing num_questions or simplifying the topic."
            )

        logger.debug("Generated %d questions for '%s'.", len(questions), topic)
        return questions
