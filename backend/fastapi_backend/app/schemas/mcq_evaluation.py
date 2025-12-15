from typing import Annotated
from pydantic import BaseModel, StringConstraints, Field

class MCQEvaluation(BaseModel):

    question_id: Annotated[str,
                           StringConstraints(strip_whitespace=True, min_length=1)]
    
    selected_option: Annotated[str,
                               StringConstraints(strip_whitespace=True, min_length=1, to_lower=True)]
    
    correct_option: Annotated[str,
                              StringConstraints(strip_whitespace=True, min_length=1, to_lower=True)]
    


class MCQEvaluationResponse(BaseModel):

    question_id: Annotated[str, 
                           StringConstraints(strip_whitespace=True, min_length=1)]
    
    similarity_score: Annotated[float,
                                Field(title="Similarity Score", description="Similarity score between correct and selected option", ge=0.00, le=1.00)]

    inference: Annotated[str,
                          StringConstraints(strip_whitespace=True, min_length=1)]

    