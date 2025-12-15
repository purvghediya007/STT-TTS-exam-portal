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

            # Accept dict or pydantic model-like object
            if not result:
                raise ValueError("Model returned empty result.")

            required_keys = ["question_text", "rubrics"]

            # If it's a pydantic model instance, convert to dict
            if not isinstance(result, dict) and hasattr(result, "model_dump"):
                result = result.model_dump()

            if not isinstance(result, dict) or any(k not in result for k in required_keys):
                raise ValueError("Model returned invalid output: missing required keys.")
                
        except Exception as e:
            
            print("Rubrics generation error: ", e)

            raise HTTPException(
                status_code=500,
                detail="Rubrics generation failed due to model error"
            )
        
        result["question_id"] = payload.question_id
        return result

generate_rubrics_service = RubricsService()
