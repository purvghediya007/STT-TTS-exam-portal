from typing import Annotated
from pydantic import BaseModel, StringConstraints

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
    
    inference: Annotated[str,
                          StringConstraints(strip_whitespace=True, min_length=1)]

    