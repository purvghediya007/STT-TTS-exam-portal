from sentence_transformers import SentenceTransformer, util
from pydantic import BaseModel, Field
from typing import List, Dict, Annotated

class MCQEvaluationResponse(BaseModel):

    question_id: Annotated[str, 
                           Field(title="Question ID", description="Question ID of the question",min_length=1)]
    
    inference: Annotated[str,
                          Field(title="Result", description="Result of student", min_length=1)]


class MCQEvaluationEngine:
    def __init__(self, model_name: str, global_model = None):
        self.threshold = 0.8
        self.model_name = model_name
        self.model = global_model

    def get_model(self):
        if self.model is None:
           self.model = SentenceTransformer(self.model_name)

        return self.model

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

            # Generating necessary embeddings
            correct_option_embeddings = self.model.encode(correct_option)

            selected_option_embeddings = self.model.encode(selected_option)

            # Calculate similarity score based on cosine similarity
            
            cosine_score = util.cos_sim(correct_option_embeddings, selected_option_embeddings)

            if cosine_score >= self.threshold:
                return {
                    "question_id": input_features["question_id"],
                    "inference": "Correct Answer"
                }
            
            else: 
                return {
                    "question_id": input_features["question_id"],
                    "inference": "Incorrect Answer"
                }


        except Exception as e:
            print("MCQ Evaluation Error: ",e)
            return {
                "question_id": input_features["question_id"],
                "inference": "Could not decide due to error"
            }
