import subprocess
import time
import os

import langchain
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_ollama import ChatOllama
from langchain_huggingface import HuggingFacePipeline

from transformers import pipeline

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Dict, Optional, Annotated

class EvalSchema(BaseModel):

    score: Annotated[int, Field(title="Score of student")]
    strengths: Annotated[List[str], Field(title="Strengths in students answer")]
    weakness: Annotated[List[str], Field(title="Weaknes in students answer")]
    justification: Annotated[str, Field(title="Overall summary of evaluation")]
    suggested_improvement: Annotated[str, Field(title="Improvements in students answer after evaluation")]

class HFModelCreation:
  def __init__(self):
    pass

  def hf_model_creator(self, model_name):
    try:
      model_pipeline = pipeline(
          task="text-generation",
          model = model_name,
          temperature = 0.1,
          max_new_tokens = 1024,
          return_full_text = False,
          repetition_penalty = 1.1
      )

      model = HuggingFacePipeline(pipeline = model_pipeline)

      return model

    except Exception as e:
      print(f"Some error occured! Details: {e}")

class EvaluationEngine(HFModelCreation):

  def __init__(self, model_name):
    self.model = super().hf_model_creator(model_name)

  def create_rubrics(self, input_features: dict):
    try:
      if "question" not in input_features:
        raise KeyError("Input features must have an attribute of question")
      elif "max_marks" not in input_features:
        raise KeyError("Input features must have an attribute of maximum marks")

      question = input_features["question"]
      max_marks = input_features["max_marks"]


      template = """
      You are an exam evaluation model.

        Your task is to create rubrics for the question and maximum marks provided.
        You MUST output a valid string object that adheres to the required structure.

        Question: {question}
        MaximumMarks: {max_marks}

      """

      prompt = PromptTemplate(
          template=template,
          input_variables=["question", "max_marks"],
      )

      chain = prompt | self.model | StrOutputParser()

      rubric = chain.invoke({
          "question": input_features["question"],
          "max_marks": input_features["max_marks"],
      })

      return rubric

    except Exception as e:
      print(f"Some error occured! Details: {e}")



  def create_evaluation_chain(self):
    try:
      parser = JsonOutputParser(pydantic_object=EvalSchema)


      template = """
      <|im_start|>system
You are a strict exam evaluation engine. You must respond with valid JSON only.
Do not add any conversational text, Markdown formatting, or code blocks.
<|im_end|>
<|im_start|>user
Refrence Material:
Rubric: {rubric}
Question: {question}
Maximum Marks: {max_marks}

Student Answer:
{answer}

Evaluate the student answer.
{format_instructions}
<|im_end|>
<|im_start|>assistant
      """

      prompt = PromptTemplate(
            template=template,
            input_variables=["question", "rubric", "answer", "max_marks"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
      )

      chain = prompt | self.model | parser

      return chain, parser

    except Exception as e:
      print(f"Some error occured! Details: {e}")




  def model_evaluator(self, input_features: dict):
    try:
      self.chain, self.parser = self.create_evaluation_chain()

      input_features.update({"rubric":self.create_rubrics(input_features)})

      self.response = self.chain.invoke(input_features)

      return self.response

    except Exception as e:
      print(f"Some error occured! Details: {e}")

answer_evaluator = EvaluationEngine(model_name="Qwen/Qwen3-4B-Instruct-2507")

input_features = {
    "question": "Differentiate between supervised and unsupervised machine learning.",
    "answer": "Supervised ML is used when we supervise the model and unsupervised ML is used when it runs on its own",
    "max_marks": 10
}

evaluation = answer_evaluator.model_evaluator(input_features)

print(evaluation)

input_features = {
    "question": "Differentiate between L1 and L2 Regularization in the context of model coefficients.",
    "answer": "L1 (Lasso) regularization adds the absolute value of the magnitude of the coefficients to the loss function, which can lead to sparse models by driving some coefficients to exactly zero. L2 (Ridge) regularization adds the squared magnitude of the coefficients, which primarily shrinks the coefficients without forcing them to zero.",
    "max_marks": 10
}

evaluation = answer_evaluator.model_evaluator(input_features)

print(evaluation)

input_features = {
    "question": "What is Artificial Intelligence?",
    "answer": "Artificial Intelligence (AI) is the field of computer science that enables machines to perform tasks that normally require human intelligence. It includes abilities like learning from data, reasoning, problem-solving, perception, and decision-making. AI systems mimic human cognitive functions to automate and enhance various processes.",
    "max_marks": 10
}

evaluation = answer_evaluator.model_evaluator(input_features)

print(evaluation)

