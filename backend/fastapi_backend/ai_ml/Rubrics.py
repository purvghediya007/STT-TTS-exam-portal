from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from ai_ml.ModelCreator import HFModelCreation

from pydantic import BaseModel,Field
from typing import List, Dict, Annotated, Optional

import re
import json

class RubricsResponse(BaseModel):

    question_id: Annotated[str, Field(topic="Question ID",min_length=1)]

    question_text: Annotated[str, Field(topic="Question", min_length=1)]

    rubrics: Annotated[List[str],Field(topic="Generated Rubrics",min_length=1)]



class RubricsEngine():
    def __init__(self, model_name: str, global_model = None):
        self.model_name = model_name
        self.model = global_model

    def get_model(self):
        if self.model is None:
            self.model = HFModelCreation.hf_model_creator(self.model_name)
        return self.model

    def sanitize_json(self, text: str) -> str:
        text = text.replace("```json", "").replace("```", "").strip()
        m = re.search(r"\{[\s\S]*\}", text)
        if m:
            text = m.group(0)
        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*]", "]", text)
        return text


    def create_rubrics_chain(self):

        try:
            parser = JsonOutputParser(pydantic_object=RubricsResponse)

            template = """
You are an exam evaluator.
Generate marking rubrics for the given question.

Return the output ONLY in valid JSON format exactly like this:

{
  "question_id": "",
  "question_text": "",
  "rubrics": ["...", "..."]
}

Question: {question_text}
Total Marks: {max_marks}

{format_instructions}
"""

            prompt = PromptTemplate(
                template=template,
                input_variables=["question_text", "max_marks"],
                partial_variables={
                    "format_instructions" : parser.get_format_instructions()
                }
            )

            chain = prompt | self.model
            return chain, parser

        except Exception as e:
            print("Rubric chain creation error:", e)
            return ""

    def create_rubrics(self, input_features: dict):

        try:
            if "max_marks" not in input_features:
                raise KeyError("Input features must contain the maximum marks of question")
            
            elif "question_text" not in input_features:
                raise KeyError("Input features must contain the question")
            
            chain, parser = self.create_rubrics_chain()

            raw = chain.invoke(input_features)

            # Extract actual text reliably
            if isinstance(raw, dict) and "text" in raw:
                output = raw["text"]

            elif isinstance(raw, dict) and "generated_text" in raw:
                output = raw["generated_text"]

            elif hasattr(raw, "generations"):
                output = raw.generations[0][0].text

            elif isinstance(raw, list) and isinstance(raw[0], dict) and "generated_text" in raw[0]:
                output = raw[0]["generated_text"]

            else:
                output = str(raw)

            cleaned = self.sanitize_json(output)
            return parser.parse(cleaned)

        except Exception as e:
            print("Rubrics creation error. Details: ",e )
            