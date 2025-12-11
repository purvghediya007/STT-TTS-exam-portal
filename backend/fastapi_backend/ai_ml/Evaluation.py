from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from pydantic import BaseModel, Field
from typing import List, Annotated
import re

from ai_ml.ModelCreator import HFModelCreation

class EvalSchema(BaseModel):
    score: Annotated[int, Field(title="Score of student")]
    strengths: Annotated[List[str], Field(title="Strengths in student's answer")]
    weakness: Annotated[List[str], Field(title="Weaknesses in student's answer")]
    justification: Annotated[str, Field(title="Summary of evaluation")]
    suggested_improvement: Annotated[str, Field(title="Improvements required")]



class EvaluationEngine():

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = None

    def get_model(self):
        if self.model is None:
            self.model = HFModelCreation.hf_model_creator(self.model_name)
        return self.model

    def sanitize_json(self, text: str) -> str:
        text = text.replace("```json", "").replace("```", "").strip()
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            text = match.group(0)
        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*]", "]", text)
        return text

    def create_evaluation_chain(self):
        try:
            parser = JsonOutputParser(pydantic_object=EvalSchema)

            template = """
You are a strict exam evaluation engine.
Return ONLY valid JSON. If JSON is malformed, fix it and return valid JSON.

Rubric:
{rubric}

Question:
{question_text}

Student Answer:
{student_answer}

Maximum Marks: {max_marks}

{format_instructions}
"""

            prompt = PromptTemplate(
                template=template,
                input_variables=["rubric", "question_text", "student_answer", "max_marks"],
                partial_variables={"format_instructions": parser.get_format_instructions()},
            )

            chain = prompt | self.get_model()
            return chain, parser

        except Exception as e:
            print("Error creating evaluation chain:", e)
            return None, None

    def model_evaluator(self, input_features: dict):
        try:

            chain, parser = self.create_evaluation_chain()
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
            print("Evaluation Error:", e)
            return {}
