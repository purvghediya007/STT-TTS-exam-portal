from ai_ml.Evaluation import EvaluationEngine
from app.config import settings
from app.schemas.evaluation import (
    EvaluateAnswer,
    EvaluateAnswerResponse
)

engine = EvaluationEngine(model_name=settings.HF_EVAL_MODEL_NAME)

def evaluate(payload: EvaluateAnswer) -> EvaluateAnswerResponse:
    features = {
        "question": payload.question_text,
        "answer": payload.student_answer,
        "max_marks": payload.max_marks,
    }

    result = engine.model_evaluator(features)

    return EvaluateAnswerResponse(
        question_id=payload.question_id,
        score=result["score"],
        strengths=result["strengths"],
        weakness=result["weakness"],
        justification=result["justification"],
        suggested_improvement=result["suggested_improvement"],
    )
