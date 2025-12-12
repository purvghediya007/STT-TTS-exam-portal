from fastapi import APIRouter
from app.schemas.rubrics import RubricsRequest, RubricsResponse
from app.services.rubrics_service import generate_rubrics_service

router = APIRouter(
    prefix = "/rubrics",
    tags = ["rubrics"]
)

@router.post("/create", response_model= RubricsResponse)
async def generate_rubrics(payload: RubricsRequest):
    
    return generate_rubrics_service.generate(payload)

