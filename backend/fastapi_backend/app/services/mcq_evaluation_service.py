from ai_ml.MCQEvaluation import MCQEvaluationEngine
from app.schemas.mcq_evaluation import MCQEvaluation
from app.core import models   
from app.config import settings

model_name = settings.MCQ_EVAL_MODEL_NAME

class MCQEvaluationService:

    def evaluate(self, payload: MCQEvaluation):
        data = payload.model_dump()

        try:
            # use models.st_model loaded during lifespan
      
            result = MCQEvaluationEngine(model_name=model_name, global_model=models.st_model).evaluate(data)

            required_keys = ["inference"]

            if (
                not result
                or not isinstance(result, dict)
                or any(k not in result for k in required_keys)
            ):
                raise ValueError("Model returned invalid output.")

        except Exception as e:
            print("MCQ Evaluation error:", e)

            return {
                "question_id": payload.question_id,
                "inference": "Could not decide due to error"
            }
        
        return result


mcq_evaluator_service = MCQEvaluationService()
