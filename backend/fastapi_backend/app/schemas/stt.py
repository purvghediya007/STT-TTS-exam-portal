# app/schemas/stt.py
from pydantic import BaseModel, constr,StringConstraints
from typing import Optional,Annotated

class STTResponse(BaseModel):
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    language: Optional[str] = None
    model: Optional[str] = None
