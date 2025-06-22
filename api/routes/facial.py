from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np

from fer2013.predict import load_model_and_predict
from fer2013.preprocessingImage import preprocess, PreprocessingError

router = APIRouter()

@router.get("/")
def root():
    return {"message": "Facial emotion router works!"}

class ImageRequest(BaseModel):
    image: str  # base64 encoded string

@router.post("/")
async def predict_emotion(request: ImageRequest):
    try:
        preprocessed_image = preprocess(request.image)
        input_batch = np.expand_dims(preprocessed_image, axis=0).astype('float32') / 255.0
        emotion = load_model_and_predict(input_batch)

        if emotion == "error":
            return JSONResponse(status_code=500, content={"error": "Prediction failed."})

        return {"prediction": emotion}
    except PreprocessingError as e:
        return JSONResponse(status_code=400, content={"error": e.user_message})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Server error during prediction"})
