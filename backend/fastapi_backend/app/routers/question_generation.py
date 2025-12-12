from fastapi import APIRouter
from app.schemas.question_generation import QuestionGenerationRequest, QuestionGenerationResponse
from app.services.question_generation_service import generation_service

router = APIRouter(
    prefix="/questions_generate",
    tags = ["questions_generation"]
)

@router.post("/generate", response_model= QuestionGenerationResponse)
async def generate_route(payload: QuestionGenerationRequest):
    return generation_service.generate(payload)




