"""Provider-neutral theory question generation engine."""
from __future__ import annotations

import json
import logging
import re
from typing import List

from langchain_core.prompts import ChatPromptTemplate

from ai_ml.exceptions import ChainCreationError, QuestionsGenerationError
from ai_ml.provider_factory import get_llm_model
from ai_ml.token_budget import estimate_question_gen_tokens

logger = logging.getLogger(__name__)

_QUESTION_SYSTEM = """You are an academic exam question setter. Respond with ONLY a valid JSON object.
Generate theory-based, verbally answerable exam questions. Never use code, programs, or algorithms.
Stay strictly within the requested topic. Use clear, complete sentences ending in question marks.
Difficulty: EASY means definitions and purposes; MEDIUM means explanations and examples; HARD means
critical thinking, limitations, trade-offs, and applications.
The JSON object must contain a string topic and a questions array with exactly the requested count.
No markdown, comments, preamble, or trailing text. Example shape:
{{"topic":"<topic>","questions":["<question 1>","<question 2>"]}}"""


class QuestionGenerator:
    def __init__(self, model=None) -> None:
        self._model = model

    def _get_model(self):
        if self._model is None:
            self._model = get_llm_model()
        return self._model

    def _build_chain(self, num_questions: int = 1):
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", _QUESTION_SYSTEM),
                ("human", "TOPIC: {topic}\nDIFFICULTY: {difficulty}\nNUMBER OF QUESTIONS: {num_questions}"),
            ])
            return prompt | self._get_model().bind(max_tokens=estimate_question_gen_tokens(num_questions))
        except Exception as exc:
            raise ChainCreationError(f"Could not build question generation chain: {exc}") from exc

    @staticmethod
    def _sanitize_json(text: str) -> str:
        text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
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
        normalized = []
        for q in raw_questions:
            if isinstance(q, str):
                q = re.sub(r"^\s*\d+[.)]\s*", "", q).strip()
                if q:
                    normalized.append(q)
        return normalized[:num_questions]

    def generate(self, *, topic: str, num_questions: int, difficulty: str) -> List[str]:
        try:
            raw = self._build_chain(num_questions).invoke({"topic": topic, "num_questions": num_questions, "difficulty": difficulty})
        except ChainCreationError:
            raise
        except Exception as exc:
            raise QuestionsGenerationError(f"LLM call failed: {exc}") from exc
        content = raw.content if hasattr(raw, "content") else str(raw)
        try:
            data = json.loads(self._sanitize_json(content))
            questions = self._normalize_questions(data.get("questions", []), num_questions)
        except (ValueError, json.JSONDecodeError) as exc:
            raise QuestionsGenerationError(f"Invalid JSON from model. Original error: {exc}") from exc
        if not questions or len(questions) < num_questions:
            raise QuestionsGenerationError(f"Expected {num_questions} questions but received only {len(questions)}.")
        return questions
