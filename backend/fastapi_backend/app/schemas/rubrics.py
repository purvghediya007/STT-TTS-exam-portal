from typing import List, Dict, Annotated, Optional
from pydantic import BaseModel, Field, StringConstraints

class RubricsRequest(BaseModel):

    question_id: Annotated[str,
                           StringConstraints(strip_whitespace=True, min_length=1)]
    
    question_text: Annotated[str, 
                           StringConstraints(strip_whitespace=True, min_length=1)]
    
    max_marks: Annotated[int,
                         Field(ge=1, le=100)]

class RubricsResponse(BaseModel):

    question_id: Annotated[str,
                           StringConstraints(strip_whitespace=True, min_length=1)]

    question_text: Annotated[str, 
                           StringConstraints(strip_whitespace=True, min_length=1)]

    rubrics: Annotated[List[str],
                           StringConstraints(strip_whitespace=True, min_length=1)]

