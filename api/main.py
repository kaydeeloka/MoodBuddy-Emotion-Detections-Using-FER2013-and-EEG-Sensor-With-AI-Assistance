#main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import users, moods, facial, chatbot
from eegsensor import eegEmotiv
from db.database import Base, engine

# Initialize the database
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(facial.router, prefix="/facial_emotion", tags=["facial_emotion"])
app.include_router(eegEmotiv.router, prefix="/eeg", tags=["eeg"])  
app.include_router(chatbot.router, prefix="/chatbot", tags=["chatbot"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(moods.router, prefix="/moods", tags=["moods"])

@app.get("/")
def root():
    return {"message": "Unified Emotion API is running"}
