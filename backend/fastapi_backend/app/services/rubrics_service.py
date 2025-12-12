from app.schemas.rubrics import RubricsRequest
from app.core import models
from ai_ml.Rubrics import RubricsEngine
from app.config import settings
from fastapi import HTTPException

model_name = settings.HF_EVAL_MODEL_NAME

class RubricsService:
    def generate(self, payload: RubricsRequest):

        data = payload.model_dump()

        try: 
            
            # Use models.ai_model loaded during lifespan

            result = RubricsEngine(model_name=model_name, global_model=models.ai_model).create_rubrics(data)

            required_keys = ["question", "rubrics"]

            if (
                not result 
                or not isinstance(result, dict)
                or any(k not in result for k in required_keys)
            ):
                raise ValueError("Model returned invalid output.")
            
        except Exception as e:
            
            print("Rubrics generation error: ", e)

            raise HTTPException(
                status_code=500,
                detail="Rubrics generation failed due to model error"
            )
        
        result["question_id"] = payload.question_id
        return result

generate_rubrics_service = RubricsService()
