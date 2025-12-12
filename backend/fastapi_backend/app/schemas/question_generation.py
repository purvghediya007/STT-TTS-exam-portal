from typing import List, Dict, Annotated, Optional
from pydantic import BaseModel, Field, StringConstraints

class QuestionGenerationRequest(BaseModel):

    topic_id: Annotated[str,
                        StringConstraints(strip_whitespace=True, min_length=1)]

    topic: Annotated[str, 
                     StringConstraints(strip_whitespace=True, min_length=1)]
    
    subject: Annotated[str,
                       StringConstraints(strip_whitespace=True, min_length=1)]
    
    num_questions: Annotated[int,
                             Field(ge=1, le=100)]
    

class QuestionGenerationResponse(BaseModel):

    topic_id: Annotated[str,
                        StringConstraints(strip_whitespace=True, min_length=1)]
    
    topic: Annotated[str, 
                     StringConstraints(strip_whitespace=True, min_length=1)]
    
    questions: Annotated[List[str],
                         Field(min_length=1)]
    
    

