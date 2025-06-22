from enum import Enum
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import date, datetime
from typing import Optional, Dict, Any

# User Schemas
class UserCreate(BaseModel):
    username: str  
    email: EmailStr
    full_name: str
    dob: Optional[date] = None
    password: str

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    email: str  # login by email
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str
    dob: Optional[date]

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[date] = None
    password: Optional[str] = None

    class Config:
        from_attributes = True

class BandPowerResponse(BaseModel):
    band: str
    percentage: float
    description: str

class ConnectionResponse(BaseModel):
    status: str
    message: str
    connected: bool

class EEGStatusResponse(BaseModel):
    connected: bool
    subscribed: bool
    session_created: bool
    message: str

# Mood Analysis Schemas - Fixed without enum references
class MoodAnalysisCreate(BaseModel):
    user_id: str = Field(..., description="Username of the user")
    mood_date: date = Field(..., description="Date for the mood entry")
    mood: Optional[str] = Field(None, description="User's subjective mood")
    combined_mood: Optional[str] = Field(None, description="Combined mood description")
    eeg_emotional_state: Optional[str] = Field(None, description="EEG-derived emotional state")
    note: Optional[str] = Field(None, description="Optional note about the mood")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "kaydee",
                "mood_date": "2025-06-19",
                "mood": "happy",
                "combined_mood": "peaceful_happy",
                "eeg_emotional_state": "Peaceful Contentment",
                "note": "Great meditation session today!"
            }
        }

# Save mood analysis result in database
class MoodAnalysisResult(BaseModel):
    user_id: str = Field(..., description="Username of the user")
    mood_date: date = Field(..., description="Date for the mood entry")
    mood: Optional[str] = Field(None, description="User's subjective mood")
    combined_mood: Optional[str] = Field(None, description="Combined mood description")
    eeg_emotional_state: Optional[str] = Field(None, description="EEG-derived emotional state")
    note: Optional[str] = Field(None, description="Optional note about the mood")
    
    @validator('mood_date', pre=True)
    def parse_date(cls, v):
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "kaydee",
                "mood_date": "2025-06-22",
                "mood": "happy",
                "combined_mood": "happy_alpha",
                "eeg_emotional_state": "Peaceful Contentment",
                "note": "Detected via scan"
            }
        }

class MoodAnalysisResponse(BaseModel):
    id: int
    user_id: str
    mood_date: date
    mood: Optional[str]
    combined_mood: Optional[str]
    eeg_emotional_state: Optional[str]
    note: Optional[str]
    
    class Config:
        from_attributes = True

# EEG Data Processing Schemas
class EEGData(BaseModel):
    alpha: float
    beta: float
    theta: float
    delta: float
    gamma: float

# Find dominant eeg_data from raw EEG sensor data
class MoodAnalysisRequest(BaseModel):
    facial_emotion: str
    eeg_data: EEGData

# Already know dominant brainwave
class MoodRequest(BaseModel):
    facial_emotion: str
    dominant_eeg_band: str
    band_strength: Optional[float] = 1.0

class CombinedMoodTagRequest(BaseModel):
    facial_emotion: str
    dominant_eeg_band: str

# Chatbot Schemas
class SenderEnum(str, Enum):
    user = "user"
    bot = "bot"

class ChatMessageCreate(BaseModel):
    user_id: int
    sender: SenderEnum
    message: str

#to save the chatbot prompt
class ChatMessageMood(BaseModel):
    user_id: int  
    sender: str = "bot"  # Fixed as 'bot'
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    user_id: int
    sender: SenderEnum
    message: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

class ChatbotMessageResponse(BaseModel):
    reply: str
    message_id: Optional[int] = None
    timestamp: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ChatbotInput(BaseModel):
    user_id: str  
    message: str

class NewSessionInput(BaseModel):
    user_id: str