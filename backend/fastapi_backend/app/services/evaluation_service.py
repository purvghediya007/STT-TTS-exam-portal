from ai_ml.Evaluation import EvaluationEngine
from app.schemas.evaluation import EvaluateAnswer
from app.core import models   
from app.config import Settings

model_name = Settings.HF_EVAL_MODEL_NAME

class EvaluationService:

    def evaluate(self, payload: EvaluateAnswer):
        data = payload.model_dump()

        try:
            # use models.ai_model loaded during lifespan
      
            result = EvaluationEngine(model_name=model_name, global_model=models.ai_model).model_evaluator(data)

            required_keys = ["score", "strengths", "weakness",
                             "justification", "suggested_improvement"]

            if (
                not result
                or not isinstance(result, dict)
                or any(k not in result for k in required_keys)
            ):
                raise ValueError("Model returned invalid output.")

        except Exception as e:
            print("Evaluation error:", e)

            return {
                "question_id": payload.question_id,
                "score": 0,
                "strengths": ["No strengths could be evaluated due to model error."],
                "weakness": ["The evaluator model failed to process the answer."],
                "justification": f"Internal model error: {str(e)}",
                "suggested_improvement": "Retry after the evaluator model loads successfully."
            }

        result["question_id"] = payload.question_id
        return result


evaluator_service = EvaluationService()
