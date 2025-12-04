from typing import Optional, Dict, Any, Annotated,List
from pydantic import BaseModel, Field, StringConstraints

class EvaluateAnswer(BaseModel):
    # Use StringConstraints for whitespace stripping and length checks
    question_id: Annotated[str, 
                        StringConstraints(strip_whitespace=True, min_length=1)]
    
    question_text: Annotated[str,
                             StringConstraints(strip_whitespace=True, min_length=5, max_length=3000)]
    
    student_answer: Annotated[str, 
        StringConstraints(strip_whitespace=True, min_length=1, max_length=8000)
    ]
    
    max_marks: Annotated[float, Field(ge=1, le=100)] = 10
    
    # # Optional fields remain the same
    # reference_answer: Optional[str] = None
    # metadata: Optional[Dict[str, Any]] = None


class EvaluateAnswerResponse(BaseModel):
    question_id: str
    score: int
    strengths: List[str]
    weakness: List[str]
    justification: str
    suggested_improvement: str
