from fastapi import APIRouter
from app.schemas.evaluation import EvaluateAnswer, EvaluateAnswerResponse
from app.services.evaluation_service import evaluator_service

router = APIRouter(prefix="/evaluate", tags=["evaluation"])

@router.post("/answer", response_model=EvaluateAnswerResponse)
async def eval_route(payload: EvaluateAnswer):
    return evaluator_service.evaluate(payload)
