from ai_ml.Evaluation import EvaluationEngine
from app.schemas.evaluation import EvaluateAnswer

# Singleton evaluator (lazy model loading inside it)
evaluator = EvaluationEngine(model_name="Qwen/Qwen3-4B-Instruct-2507")

class EvaluationService:

    def evaluate(self, payload: EvaluateAnswer):
        data = payload.dict()

        result = evaluator.model_evaluator(data)

        
        result["question_id"] = payload.question_id

        return result


# Export single shared service instance
evaluator_service = EvaluationService()
