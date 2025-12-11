from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser

from pydantic import BaseModel, Field
from typing import List, Dict, Annotated, Optional
import re

from ai_ml.ModelCreator import HFModelCreation
from ai_ml.AIExceptions import *


class OutputResponse(BaseModel):
    topic: Annotated[str, Field(title="Topic of Questions", description="The topic regarding which you wanted questions")]
    questions: Annotated[List[str], Field(title="Questions", description="The questions created by the model")]

class QuestionsGenerator:
    def __init__(self, model_name: str):
        if self.model is None:
            self.model = HFModelCreation.hf_model_creator(model_name)

    
    def chain_creator(self):
        parser = JsonOutputParser(pydantic_object=OutputResponse)

        template = """
You are an exam evaluator. 
You have to generate some number of questions on the given topic from the subject given below

Be sure that the questions are well stuctured and to the context of the topic and must fall within the subject as requested
Return ONLY valid JSON. If JSON is malformed, fix it and return valid JSON

Number of questions: {num_questions},

Topic: {topic}

Suject: {subject}

{format_instructions}
"""

        prompt = PromptTemplate(
            template=template,
            input_variables= ["num_questions", "topic", "subject"],
            partial_variables= {
                "format_instructions": parser.get_format_instructions()
            }
        )


        chain = prompt | self.model

        return chain, parser

    def sanitize_json(self, text: str) -> str:
        text = text.replace("```json", "").replace("```", "").strip()
        m = re.search(r"\{[\s\S]*\}", text)
        if m:
            text = m.group(0)
        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*]", "]", text)
        return text


    def create_questions(self, input_request: dict):
        if "topic" not in input_request:
            raise KeyError("Input request must contain the topic related to which you want questions")
        
        elif "subject" not in input_request:
            raise KeyError("Input request must contain the subject related to which you want questions")

        elif "num_questions" not in input_request:
            raise KeyError("Input request must contain the number of questions you want related to the topic")
        
        try:
            parser = JsonOutputParser(pydantic_object=OutputResponse)

            
            chain, parser = self.chain_creator()

            raw = chain.invoke(input_request)

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
            print(f"Some error occured! Details: {e}")