from ai_ml.Evaluation import EvaluationEngine
from app.schemas.evaluation import EvaluateAnswer

# Lazy-loaded model
evaluator = EvaluationEngine(model_name="Qwen/Qwen2.5-3B-Instruct")

class EvaluationService:

    def evaluate(self, payload: EvaluateAnswer):
        data = payload.dict()

        try:
            result = evaluator.model_evaluator(data)

            # If model returned None or unexpected format
            if (
                not result 
                or not isinstance(result, dict) 
                or any(k not in result for k in ["score", "strengths", "weakness", "justification", "suggested_improvement"])
            ):
                raise ValueError("Model returned invalid output.")

        except Exception as e:
            print("Evaluation error:", e)

            # Always return a valid response structure
            return {
                "question_id": payload.question_id,
                "score": 0,
                "strengths": ["No strengths could be evaluated due to model error."],
                "weakness": ["The evaluator model failed to process the answer."],
                "justification": f"Internal model error: {str(e)}",
                "suggested_improvement": "Retry after the evaluator model loads successfully."
            }

        # Add question id to correct model response
        result["question_id"] = payload.question_id
        return result


evaluator_service = EvaluationService()
