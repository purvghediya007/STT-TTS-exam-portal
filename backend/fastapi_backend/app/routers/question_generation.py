from fastapi import APIRouter, HTTPException
from app.schemas.question_generation import QuestionGenerationRequest, QuestionGenerationResponse
from app.services.question_generation_service import generation_service

router = APIRouter(
    prefix="/questions_generate",
    tags = ["questions_generation"]
)

@router.post("/generate", response_model= QuestionGenerationResponse)
async def generate_route(payload: QuestionGenerationRequest):
    questions = generation_service.generate(payload)

    if not questions:
        raise HTTPException(
            status_code=500,
            detail="Model failed to generate questions"
        )

    return questions




