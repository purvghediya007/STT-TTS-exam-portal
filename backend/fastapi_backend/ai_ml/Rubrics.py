from langchain_core.prompts import PromptTemplate

from ai_ml.ModelCreator import HFModelCreation

class RubricsEngine(HFModelCreation):
    def __init__(self, model_name: str):
        if self.model is None:
            self.model = super().hf_model_creator(model_name)


    def create_rubrics(self, input_features: str) -> str:

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

            chain = prompt | self.model
            rubrics =  chain.invoke(input_features)
            return rubrics

        except Exception as e:
            print("Rubric creation error:", e)
            return ""

        