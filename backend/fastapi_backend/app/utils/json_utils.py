"""
Shared JSON extraction and repair utilities.

The LLM occasionally wraps its JSON output in markdown fences or uses
single quotes / unquoted keys. This module provides a single, well-tested
function to robustly extract and parse JSON from raw model output.
"""

from __future__ import annotations

import json
import logging
import re
from json import JSONDecodeError

logger = logging.getLogger(__name__)


def extract_json(text: str) -> dict:
    """
    Extract and parse a JSON object from raw LLM output.

    Strategy:
      1. Strip markdown code fences.
      2. Find the first ``{...}`` block (falls back to ``[...]``).
      3. Attempt direct parse.
      4. If that fails, apply common fixes (single-quote → double-quote,
         unquoted keys, trailing commas) and retry.

    Args:
        text: Raw string returned by the language model.

    Returns:
        Parsed Python dict (or list for array-only responses).

    Raises:
        ValueError: If no valid JSON can be extracted after all repair attempts.
    """
    # Step 1: strip markdown fences
    text = text.strip()
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)

    # Step 2: locate the JSON block
    json_match = re.search(r"(\{.*\})", text, re.DOTALL) or re.search(
        r"(\[.*\])", text, re.DOTALL
    )
    if not json_match:
        raise ValueError("No JSON object or array found in model output.")

    json_str = json_match.group(1).strip()

    # Step 3: direct parse
    try:
        return json.loads(json_str)
    except JSONDecodeError:
        pass

    # Step 4: apply common repairs
    fixed = json_str

    # single-quoted string values  →  double-quoted
    fixed = re.sub(r":\s*'(.*?)'\s*([,}])", r': "\1"\2', fixed)
    fixed = re.sub(r"\{\s*'(.*?)'\s*:", r'{ "\1":', fixed)

    # unquoted property names  →  double-quoted
    fixed = re.sub(
        r'(?<!["\\w])(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s*:',
        r'"\1":',
        fixed,
    )

    # trailing commas before } or ]
    fixed = re.sub(r",\s*([}\]])", r"\1", fixed)

    try:
        return json.loads(fixed)
    except JSONDecodeError as exc:
        logger.debug(
            "JSON repair failed.\nOriginal (first 400): %s\nFixed (first 400): %s",
            json_str[:400],
            fixed[:400],
        )
        raise ValueError(f"Could not parse JSON from model output: {exc}") from exc
