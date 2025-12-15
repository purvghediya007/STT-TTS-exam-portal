# app/schemas/stt.py
from pydantic import BaseModel, constr,StringConstraints
from typing import Optional,Annotated

class STTResponse(BaseModel):
    text: Optional[str] = None
    language: Optional[str] = None
    model: Optional[str] = None
