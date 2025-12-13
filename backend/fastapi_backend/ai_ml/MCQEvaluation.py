from sentence_transformers import SentenceTransformer, util
from pydantic import BaseModel, Field
from typing import List, Dict, Annotated

class MCQEvaluationResponse(BaseModel):

    question_id: Annotated[str, 
                           Field(title="Question ID", description="Question ID of the question",min_length=1)]
    
    similarity_score: Annotated[float,
                                Field(title="Similarity Score", description="Similarity score between correct and selected option", ge=0.00, le=1.00)]

    inference: Annotated[str,
                          Field(title="Result", description="Result of student", min_length=1)]


class MCQEvaluationEngine:
    def __init__(self, model_name: str, global_model = None):
        self.threshold = 0.9
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

            model = self.get_model()

            correct_option_embeddings = model.encode(correct_option)

            selected_option_embeddings = model.encode(selected_option)

            # Calculate similarity score based on cosine similarity
            
            cosine_score = util.cos_sim(correct_option_embeddings, selected_option_embeddings)

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
