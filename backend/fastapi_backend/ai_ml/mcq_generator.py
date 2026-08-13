"""Provider-neutral multiple-choice question generation engine."""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from langchain_core.prompts import ChatPromptTemplate

from ai_ml.exceptions import ChainCreationError, QuestionsGenerationError
from ai_ml.provider_factory import get_llm_model
from ai_ml.token_budget import estimate_mcq_gen_tokens

logger = logging.getLogger(__name__)

_MCQ_SYSTEM = """You are an academic exam question setter. Respond with ONLY a valid JSON object.
Generate clear exam MCQs strictly within the requested topic. Each MCQ has exactly four options A, B,
C, and D, with one correct option. Difficulty: EASY definitions and purposes; MEDIUM explanations and
examples; HARD critical thinking, limitations, trade-offs, and applications. No markdown, comments,
preamble, or trailing text. The object must contain topic and an mcqs array with exactly the requested
count. Each item contains question, options (four strings prefixed A:, B:, C:, D:), and correct_option."""


class MCQGenerator:
    def __init__(self, model=None) -> None:
        self._model = model

    def _get_model(self):
        if self._model is None:
            self._model = get_llm_model()
        return self._model

    def _build_chain(self, num_questions: int = 1):
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", _MCQ_SYSTEM),
                ("human", "TOPIC: {topic}\nDIFFICULTY: {difficulty}\nNUMBER OF QUESTIONS: {num_questions}"),
            ])
            return prompt | self._get_model().bind(max_tokens=estimate_mcq_gen_tokens(num_questions))
        except Exception as exc:
            raise ChainCreationError(f"Could not build MCQ generation chain: {exc}") from exc

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
    def _normalize_mcqs(raw_mcqs: list, num_questions: int) -> List[Dict[str, Any]]:
        normalized = []
        for mcq in raw_mcqs:
            if not isinstance(mcq, dict):
                continue
            question = str(mcq.get("question", "")).strip()
            options = mcq.get("options", [])
            correct = str(mcq.get("correct_option", "")).strip()
            if not question or not isinstance(options, list) or len(options) != 4 or not correct:
                continue
            options = [str(option).strip() for option in options]
            if correct not in options:
                matches = [option for option in options if correct in option or option in correct]
                if not matches:
                    continue
                correct = matches[0]
            normalized.append({"question": question, "options": options, "correct_option": correct})
        return normalized[:num_questions]

    def generate(self, *, topic: str, num_questions: int, difficulty: str) -> List[Dict[str, Any]]:
        try:
            raw = self._build_chain(num_questions).invoke({"topic": topic, "num_questions": num_questions, "difficulty": difficulty})
        except ChainCreationError:
            raise
        except Exception as exc:
            raise QuestionsGenerationError(f"LLM call failed: {exc}") from exc
        content = raw.content if hasattr(raw, "content") else str(raw)
        try:
            data = json.loads(self._sanitize_json(content))
            mcqs = self._normalize_mcqs(data.get("mcqs", []), num_questions)
        except (ValueError, json.JSONDecodeError) as exc:
            raise QuestionsGenerationError(f"Invalid JSON from model. Original error: {exc}") from exc
        if not mcqs or len(mcqs) < num_questions:
            raise QuestionsGenerationError(f"Expected {num_questions} MCQs but received only {len(mcqs)}.")
        return mcqs
