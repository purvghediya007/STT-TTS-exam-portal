from fastapi import APIRouter, HTTPException
from app.schemas.rubrics import RubricsRequest, RubricsResponse
from app.services.rubrics_service import generate_rubrics_service

router = APIRouter(
    prefix = "/rubrics",
    tags = ["rubrics"]
)

@router.post("/create", response_model= RubricsResponse)
async def generate_rubrics(payload: RubricsRequest):
    
    rubrics = generate_rubrics_service.generate(payload)

    if not rubrics:
        raise HTTPException(
            status_code=500,
            detail="Model failed to generate rubrics"
        )

    return rubrics

