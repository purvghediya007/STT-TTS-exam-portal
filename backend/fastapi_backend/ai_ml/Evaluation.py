# Llama 3.1 Evaluation Engine

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_huggingface import HuggingFacePipeline

from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from pydantic import BaseModel, Field
from typing import List, Annotated


   
# Pydantic Schema for the JSON output
   
class EvalSchema(BaseModel):
    score: Annotated[int, Field(title="Score of student")]
    strengths: Annotated[List[str], Field(title="Strengths in student's answer")]
    weakness: Annotated[List[str], Field(title="Weaknesses in student's answer")]
    justification: Annotated[str, Field(title="Summary of evaluation")]
    suggested_improvement: Annotated[str, Field(title="Improvements required")]


   
# Model Loader (Llama 3.1)
   
class HFModelCreation:

    def hf_model_creator(self, model_name: str):
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_name)

            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype="auto",
                device_map="auto"
            )

            pipe = pipeline(
                "text-generation",
                model=model,
                tokenizer=tokenizer,
                max_new_tokens=800,
                temperature=0.2,
                do_sample=False,
                repetition_penalty=1.1
            )

            return HuggingFacePipeline(pipeline=pipe)

        except Exception as e:
            print("Error loading HF model:", e)
            return None


 
# Evaluation Engine
 
class EvaluationEngine(HFModelCreation):

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = None

    def get_model(self):
        """Lazy load"""
        if self.model is None:
            self.model = super().hf_model_creator(self.model_name)
        return self.model

     
    # Generate rubric
     
    def create_rubrics(self, input_features: dict) -> str:
        try:
            template = """
You are an exam evaluator.

Generate a simple, clear marking rubric for this question.

Return plain text only. No JSON, no examples, no markdown.

FORMAT EXACTLY:
Criteria 1 - X marks: description
Criteria 2 - Y marks: description
...
Total Marks: {max_marks}

Question: {question_text}
"""

            prompt = PromptTemplate(
                template=template,
                input_variables=["question_text", "max_marks"]
            )

            chain = prompt | self.get_model()
            rubric_text = chain.invoke(input_features)

            return rubric_text

        except Exception as e:
            print("Rubric creation error:", e)
            return ""

     
    # Create JSON evaluation chain
     
    def create_evaluation_chain(self):
        try:
            parser = JsonOutputParser(pydantic_object=EvalSchema)

            template = """
You are a strict exam evaluation engine.

You MUST return ONLY valid JSON.
NO explanations.
NO markdown.
NO natural language before or after JSON.

Rubric:
{rubric}

Question:
{question_text}

Student Answer:
{student_answer}

Maximum Marks: {max_marks}

Respond ONLY in this JSON format:
{format_instructions}
"""

            prompt = PromptTemplate(
                template=template,
                input_variables=["rubric", "question_text", "student_answer", "max_marks"],
                partial_variables={"format_instructions": parser.get_format_instructions()},
            )

            chain = prompt | self.get_model() | parser
            return chain, parser

        except Exception as e:
            print("Error creating evaluation chain:", e)
            return None, None

     
    # Run evaluation
     
    def model_evaluator(self, input_features: dict):
        try:
            # create rubric
            input_features["rubric"] = self.create_rubrics(input_features)

            # create evaluation chain
            chain, parser = self.create_evaluation_chain()

            # run model
            response = chain.invoke(input_features)
            return response

        except Exception as e:
            print("Evaluation Error:", e)
            return {}
