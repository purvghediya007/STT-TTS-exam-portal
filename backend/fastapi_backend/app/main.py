from fastapi import FastAPI
from app.routers import stt, evaluation,tts

app = FastAPI(title="Examecho AI Service")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(stt.router)
app.include_router(evaluation.router)