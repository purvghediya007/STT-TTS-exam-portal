from app.schemas.question_generation import QuestionGenerationRequest
from app.core import models

class QuestionGenerationService:

    def generate(self, payload: QuestionGenerationRequest):

        data = payload.model_dump()

        try:

            # Use models.ai_model loaded during lifespan

            result = models.ai_model.create_questions(data)

            required_keys = ["topic", "questions"]

            if (
                not result 
                or not isinstance(result, dict)
                or any(k not in result for k in required_keys)
            ):
                raise ValueError("Model returned invalid output.")
            
        except Exception as e:
            
            print("Generation error: ", e)

            return {
                "topic_id": payload.topic_id,
                "topic": payload.topic,
                "questions": ["No questions could be generated due to model error"]
            }

        result["topic_id"] = payload.topic_id
        return result

generation_service = QuestionGenerationService()