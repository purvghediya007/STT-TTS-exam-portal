from sentence_transformers import SentenceTransformer, util
from pydantic import BaseModel, Field
from typing import Annotated
import re

class MCQEvaluationResponse(BaseModel):

    question_id: Annotated[str, 
                           Field(title="Question ID", description="Question ID of the question",min_length=1)]
    
    similarity_score: Annotated[float,
                                Field(title="Similarity Score", description="Similarity score between correct and selected option", ge=0.00, le=1.00)]

    inference: Annotated[str,
                          Field(title="Result", description="Result of student", min_length=1)]


class MCQEvaluationEngine:
    def __init__(self, model_name: str, global_model = None):
        self.threshold = 0.75
        self.model_name = model_name
        self.model = global_model

    def get_model(self):
        if self.model is None:
           self.model = SentenceTransformer(self.model_name)

        return self.model

    def _extract_option_label(self, text: str) -> str:
        # Extract option label like 'a', 'b', 'c', 'd' from text.
        
        if not text:
            return ""

        text = text.lower()

        # match: "option b", "answer is c", "ans d", or standalone "b"
        match = re.search(r"\b(option|answer|ans)?\s*([abcd])\b", text)

        if match:
            return match.group(2)

        return ""

    def evaluate(self, input_features: dict):
        try:

            # Validating input

            if "correct_option" not in input_features.keys():
                raise ValueError("Input Features must have a correct option")
            
            elif "selected_option" not in input_features.keys():
                raise ValueError("Input Features must have the option selected by the student")

            # Getting input values
            correct_option = input_features["correct_option"]

            selected_option = input_features["selected_option"]

            # Getting labels
            correct_label = self._extract_option_label(correct_option)

            selected_label = self._extract_option_label(selected_option)

            # First compare labels
            if correct_label and selected_label and correct_label == selected_label:
                return {
                    "question_id": input_features["question_id"],
                    "similarity_score": 1.0,
                    "inference": "Correct Answer"
                }

            # Generating necessary embeddings

            model = self.get_model()

            correct_option_embeddings = model.encode(correct_option)

            selected_option_embeddings = model.encode(selected_option)

            # Calculate similarity score based on cosine similarity
            
            cosine_score = util.cos_sim(correct_option_embeddings, selected_option_embeddings).item()

            if cosine_score >= self.threshold:
                return {
                    "question_id": input_features["question_id"],
                    "similarity_score": cosine_score,
                    "inference": "Correct Answer"
                }
            
            else: 
                return {
                    "question_id": input_features["question_id"],
                    "similarity_score": cosine_score,
                    "inference": "Incorrect Answer"
                }


        except Exception as e:
            print("MCQ Evaluation Error: ",e)
            return {
                "question_id": input_features["question_id"],
                "similarity_score": 0.00,
                "inference": "Could not decide due to error"
            }
