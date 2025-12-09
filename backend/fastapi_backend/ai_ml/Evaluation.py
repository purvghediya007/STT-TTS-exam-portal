from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_huggingface import HuggingFacePipeline

from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from pydantic import BaseModel, Field
from typing import List, Annotated
import re
import json


class EvalSchema(BaseModel):
    score: Annotated[int, Field(title="Score of student")]
    strengths: Annotated[List[str], Field(title="Strengths in student's answer")]
    weakness: Annotated[List[str], Field(title="Weaknesses in student's answer")]
    justification: Annotated[str, Field(title="Summary of evaluation")]
    suggested_improvement: Annotated[str, Field(title="Improvements required")]


class HFModelCreation:

    def hf_model_creator(self, model_name: str):
        try:
            tokenizer = AutoTokenizer.from_pretrained(
                model_name, trust_remote_code=True
            )

            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype="auto",
                device_map="auto",
                trust_remote_code=True
            )

            gen = pipeline(
                "text-generation",
                model=model,
                tokenizer=tokenizer,
                max_new_tokens=700,
                temperature=0.2,
                do_sample=False
            )

            return HuggingFacePipeline(pipeline=gen)

        except Exception as e:
            print("Error loading HF model:", e)
            return None


class EvaluationEngine(HFModelCreation):

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = None

    def get_model(self):
        if self.model is None:
            self.model = super().hf_model_creator(self.model_name)
        return self.model

    def sanitize_json(self, text: str) -> str:
        text = text.strip()
        text = text.replace("```json", "").replace("```", "")
        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*]", "]", text)
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return match.group(0)
        return text

    def create_rubrics(self, input_features: dict) -> str:
        try:
            template = """
You are an exam evaluator.
Generate a clear marking rubric.

Return only plain text (no JSON, no examples).

Criteria 1 - X marks: description
Criteria 2 - Y marks: description
Total Marks: {max_marks}

Question: {question_text}
"""
            prompt = PromptTemplate(
                template=template,
                input_variables=["question_text", "max_marks"]
            )

            chain = prompt | self.get_model()
            return chain.invoke(input_features)

        except Exception as e:
            print("Rubric creation error:", e)
            return ""

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
            input_features["rubric"] = self.create_rubrics(input_features)

            chain, parser = self.create_evaluation_chain()

            raw = chain.invoke(input_features)

            cleaned = self.sanitize_json(str(raw))

            return parser.parse(cleaned)

        except Exception as e:
            print("Evaluation Error:", e)
            return {}
