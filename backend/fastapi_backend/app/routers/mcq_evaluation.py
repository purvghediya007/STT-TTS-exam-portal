from fastapi import APIRouter
from app.schemas.mcq_evaluation import MCQEvaluation, MCQEvaluationResponse
from app.services.mcq_evaluation_service import mcq_evaluator_service

router = APIRouter(prefix="/mcq", tags=["mcq_evaluation"])

@router.post("/evaluate", response_model=MCQEvaluationResponse)
async def eval_route(payload: MCQEvaluation):
    return mcq_evaluator_service.evaluate(payload)
