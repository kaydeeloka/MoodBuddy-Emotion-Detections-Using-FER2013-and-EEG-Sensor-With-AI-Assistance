import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_, desc
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from db import models, schemas
from db.database import get_db

router = APIRouter()

# Mood metadata - Updated to match your MoodEnum
MOOD_DATA = {
    "happy": {
        "title": "Happy",
        "color": "#FFD93B",  
    },
    "sad": {
        "title": "Sad",
        "color": "#5DADEC", 
    },
    "angry": {
        "title": "Angry",
        "color": "#EA5A47", 
    },
    "neutral": {
        "title": "Neutral",
        "color": "#BDBDBD",  
    },
    "surprise": {
        "title": "Surprise",
        "color": "#A259F7",  
    },
    "fear": {
        "title": "Fear",
        "color": "#7D7D7D",  
    },
    "disgust": {
        "title": "Disgust",
        "color": "#78C850",  
    }
}

# EEG Band to State Mapping
EEG_EMOTIONAL_STATE_MAPPING = {
    "Delta": {
        "emotional_state": "Subconscious Processing",
        "mood_indicator": "Neutral",
        "color": "#2D1B69",
        "description": "Deep processing/recovery state"
    },
    "Theta": {
        "emotional_state": "Emotional Vulnerability", 
        "mood_indicator": "Sad",
        "color": "#8E44AD",
        "description": "Emotional processing and vulnerability"
    },
    "Alpha": {
        "emotional_state": "Peaceful Contentment",
        "mood_indicator": "Happy",
        "color": "#27AE60",
        "description": "Relaxed awareness and contentment"
    },
    "Beta": {
        "emotional_state": "Mental Agitation",
        "mood_indicator": "Angry",
        "color": "#F39C12",
        "description": "Stress and mental tension"
    },
    "Gamma": {
        "emotional_state": "Intense Processing",
        "mood_indicator": "Fear",
        "color": "#E74C3C",
        "description": "High-intensity emotional processing"
    }
}

# Combined mood tag mapping
COMBINED_MOOD_TAG = {
    # Happy Face Combinations
    ("happy", "neutral"): {
        "title": "Genuine Serenity",
        "interpretation": "Your happiness aligns with a calm and peaceful brain state.",
        "message": "What's bringing you peace today?",
        "prompt": "You seem at peace today. What’s bringing you this calmness?"
    },
    ("happy", "sad"): {
        "title": "Masked Depression",
        "interpretation": "You're showing happiness on the surface, but your brain patterns suggest underlying sadness or emotional processing.",
        "message": "How are you really feeling?",
        "prompt": "You look cheerful, but I sense something deeper. How are you really feeling?"
    },
    ("happy", "happy"): {
        "title": "Authentic Joy",
        "interpretation": "Your happiness is genuine and aligns with positive brain patterns.",
        "message": "What's making you so happy?",
        "prompt": "Your happiness shines through! What’s been making you smile lately?"
    },
    ("happy", "angry"): {
        "title": "Stressed Smile",
        "interpretation": "You appear happy, but your brain shows signs of stress or mental agitation underneath.",
        "message": "What's stressing you out lately?",
        "prompt": "You appear upbeat, but is there something bothering you underneath?"
    },
    ("happy", "fear"): {
        "title": "Anxious Optimism",
        "interpretation": "You seem happy, but your brain indicates intense processing or underlying anxiety.",
        "message": "What's worrying you right now?",
        "prompt": "You seem happy, yet I feel some tension. Is something worrying you?"
    },
    ("happy", "disgust"): {
        "title": "Polite Facade",
        "interpretation": "You look happy, but your brain patterns suggest some level of aversion or discomfort.",
        "message": "What's bothering you underneath?",
        "prompt": "You’re smiling, but I sense discomfort. Want to talk about what’s bothering you?"
    },
    ("happy", "surprise"): {
        "title": "Delighted Wonder",
        "interpretation": "You appear happy with an alert and surprised brain state.",
        "message": "What surprised you today?",
        "prompt": "You seem pleasantly surprised! What unexpected joy came your way?"
    },

    # Sad Face Combinations
    ("sad", "neutral"): {
        "title": "Peaceful Melancholy",
        "interpretation": "You look sad, but your brain patterns suggest inner peace and subconscious processing.",
        "message": "What's going through your mind?",
        "prompt": "You seem a bit down, but calm. What’s been on your mind lately?"
    },
    ("sad", "sad"): {
        "title": "Deep Sorrow",
        "interpretation": "Your sadness is authentic and aligns with emotional vulnerability in your brain patterns.",
        "message": "What's making you feel sad?",
        "prompt": "You seem truly sad. I’m here for you. Want to talk about what’s hurting you?"
    },
    ("sad", "happy"): {
        "title": "Hidden Strength",
        "interpretation": "You look sad, but your brain patterns suggest underlying contentment or peace.",
        "message": "What made you felt like that?",
        "prompt": "Even in sadness, I feel a quiet strength. What made you feel this way?"
    },
    ("sad", "angry"): {
        "title": "Frustrated Grief",
        "interpretation": "You appear sad, but your brain shows signs of anger or mental agitation.",
        "message": "What's frustrating you most?",
        "prompt": "I sense sadness mixed with frustration. What’s been getting to you?"
    },
    ("sad", "fear"): {
        "title": "Overwhelmed Despair",
        "interpretation": "You seem sad and your brain indicates intense emotional processing or anxiety.",
        "message": "What's overwhelming you today?",
        "prompt": "You feel deeply overwhelmed. Would you like to share what’s causing this?"
    },
    ("sad", "disgust"): {
        "title": "Bitter Disappointment",
        "interpretation": "You look sad, but your brain patterns suggest disgust or aversion.",
        "message": "What disappointed you recently?",
        "prompt": "It sounds like something has really let you down. Want to talk about it?"
    },
    ("sad", "surprise"): {
        "title": "Shocked Sadness",
        "interpretation": "You appear sad, but your brain is in an alert and processing state.",
        "message": "What shocked you today?",
        "prompt": "You seem both sad and surprised. Did something unexpected happen?"
    },

    # Angry Face Combinations
    ("angry", "neutral"): {
        "title": "Controlled Rage",
        "interpretation": "You show anger outwardly, but your brain patterns suggest you're actually quite calm inside.",
        "message": "What's frustrating you right now?",
        "prompt": "You’re holding something in. What’s been frustrating you?"
    },
    ("angry", "sad"): {
        "title": "Hurt Anger",
        "interpretation": "You appear angry, but your brain patterns suggest underlying sadness rather than rage.",
        "message": "What hurt you today?",
        "prompt": "You seem angry, but I sense some pain too. What happened?"
    },
    ("angry", "happy"): {
        "title": "Playful Aggression",
        "interpretation": "You look angry, but your brain shows patterns of contentment or peace.",
        "message": "Are you just playing around?",
        "prompt": "Are you just teasing, or is something really on your mind?"
    },
    ("angry", "angry"): {
        "title": "Pure Fury",
        "interpretation": "Your anger is genuine and aligns with agitated brain patterns.",
        "message": "What made you so angry?",
        "prompt": "You seem truly upset. Want to talk about what triggered this?"
    },
    ("angry", "fear"): {
        "title": "Defensive Rage",
        "interpretation": "You seem angry, but your brain indicates intense processing or underlying fear.",
        "message": "What's making you feel threatened?",
        "prompt": "You seem guarded. What’s making you feel unsafe or attacked?"
    },
    ("angry", "disgust"): {
        "title": "Repulsed Fury",
        "interpretation": "You appear angry, and your brain patterns suggest disgust or aversion.",
        "message": "What disgusts you so much?",
        "prompt": "I sense strong anger and revulsion. What’s been bothering you so deeply?"
    },
    ("angry", "surprise"): {
        "title": "Startled Aggression",
        "interpretation": "You look angry, but your brain is in an alert and surprised state.",
        "message": "What caught you off guard?",
        "prompt": "Something seems to have caught you off guard. Want to share what happened?"
    },

    # Fear Face Combinations
    ("fear", "neutral"): {
        "title": "Brave Composure",
        "interpretation": "You seem fearful, but your brain patterns suggest inner calm and peace.",
        "message": "What's scaring you today?",
        "prompt": "You seem scared but calm. What’s been making you feel uneasy?"
    },
    ("fear", "sad"): {
        "title": "Vulnerable Anxiety",
        "interpretation": "You appear fearful and your brain indicates emotional vulnerability or sadness.",
        "message": "What's making you anxious?",
        "prompt": "You’re carrying a lot. What’s been weighing on your heart?"
    },
    ("fear", "happy"): {
        "title": "Nervous Excitement",
        "interpretation": "You look fearful, but your brain patterns suggest underlying contentment.",
        "message": "What's got you nervous?",
        "prompt": "Are you excited or anxious—or maybe both? What’s going on?"
    },
    ("fear", "angry"): {
        "title": "Agitated Terror",
        "interpretation": "You seem fearful, but your brain shows signs of anger or mental agitation.",
        "message": "What's terrifying and angering you?",
        "prompt": "You seem both afraid and upset. Want to talk about what’s causing this storm?"
    },
    ("fear", "fear"): {
        "title": "Genuine Panic",
        "interpretation": "Your fear is authentic and aligns with intense processing in your brain.",
        "message": "What's causing this panic?",
        "prompt": "You seem truly panicked. Let’s slow down together. What’s happening?"
    },
    ("fear", "disgust"): {
        "title": "Repulsed Fear",
        "interpretation": "You appear fearful, but your brain patterns suggest disgust or aversion.",
        "message": "What's both scary and disgusting?",
        "prompt": "You seem afraid and disturbed. What’s making you feel this way?"
    },
    ("fear", "surprise"): {
        "title": "Startled Fright",
        "interpretation": "You look fearful with an alert and processing brain state.",
        "message": "What startled you just now?",
        "prompt": "You seem alarmed. Did something just happen suddenly?"
    },

    # Disgust Face Combinations
    ("disgust", "neutral"): {
        "title": "Composed Distaste",
        "interpretation": "You look disgusted, but your brain patterns suggest inner peace and calm processing.",
        "message": "What's bothering you today?",
        "prompt": "Something seems to be bothering you. What’s on your mind?"
    },
    ("disgust", "sad"): {
        "title": "Sorrowful Revulsion",
        "interpretation": "You seem disgusted and your brain indicates emotional vulnerability or sadness.",
        "message": "What's making you feel sick?",
        "prompt": "You seem hurt and turned off by something. Want to talk about it?"
    },
    ("disgust", "happy"): {
        "title": "Amused Disgust",
        "interpretation": "You appear disgusted, but your brain patterns suggest underlying contentment.",
        "message": "What's grossly amusing you?",
        "prompt": "Something seems gross but maybe funny too? What’s happening?"
    },
    ("disgust", "angry"): {
        "title": "Furious Revulsion",
        "interpretation": "You look disgusted, and your brain shows signs of anger or mental agitation.",
        "message": "What's disgusting and infuriating you?",
        "prompt": "You seem deeply upset. What’s been pushing you away emotionally?"
    },
    ("disgust", "fear"): {
        "title": "Terrified Aversion",
        "interpretation": "You seem disgusted, but your brain indicates intense processing or anxiety.",
        "message": "What's scary and gross?",
        "prompt": "You seem afraid and disturbed. What’s made you feel this way?"
    },
    ("disgust", "disgust"): {
        "title": "Pure Revulsion",
        "interpretation": "Your disgust is genuine and aligns with aversive brain patterns.",
        "message": "What's completely disgusting you?",
        "prompt": "You look completely disgusted. Want to talk about what caused that?"
    },
    ("disgust", "surprise"): {
        "title": "Shocked Disgust",
        "interpretation": "You appear disgusted, but your brain is in an alert and surprised state.",
        "message": "What disgusting thing surprised you?",
        "prompt": "You seem surprised and disgusted. What shocked you so badly?"
    },

    # Surprise Face Combinations
    ("surprise", "neutral"): {
        "title": "Peaceful Wonder",
        "interpretation": "You appear surprised, but your brain patterns suggest calm and peaceful processing.",
        "message": "What's amazingly peaceful today?",
        "prompt": "Something caught your attention gently. What was it?"
    },
    ("surprise", "sad"): {
        "title": "Melancholic Surprise",
        "interpretation": "You look surprised and your brain indicates emotional vulnerability or sadness.",
        "message": "What sad thing surprised you?",
        "prompt": "You seem surprised and a little sad. What happened?"
    },
    ("surprise", "happy"): {
        "title": "Joyful Amazement",
        "interpretation": "You seem surprised, and your brain patterns suggest underlying contentment.",
        "message": "What amazing thing happened?",
        "prompt": "You seem thrilled! What amazing thing just happened?"
    },
    ("surprise", "angry"): {
        "title": "Indignant Shock",
        "interpretation": "You appear surprised, but your brain shows signs of anger or mental agitation.",
        "message": "What shocked and angered you?",
        "prompt": "You seem shocked and frustrated. Want to unpack it together?"
    },
    ("surprise", "fear"): {
        "title": "Alarmed Surprise",
        "interpretation": "You look surprised, and your brain indicates intense processing or anxiety.",
        "message": "What alarming thing happened?",
        "prompt": "Something startled you. Want to tell me what happened?"
    },
    ("surprise", "disgust"): {
        "title": "Appalled Shock",
        "interpretation": "You seem surprised, but your brain patterns suggest disgust or aversion.",
        "message": "What appalling thing happened?",
        "prompt": "You seem shocked and disgusted. What upset you that much?"
    },
    ("surprise", "surprise"): {
        "title": "Pure Astonishment",
        "interpretation": "Your surprise is authentic and aligns with alert brain patterns.",
        "message": "What completely astonished you?",
        "prompt": "Wow, you seem totally amazed! What surprised you like that?"
    },

    # Neutral Face Combinations
    ("neutral", "neutral"): {
        "title": "Perfect Balance",
        "interpretation": "You maintain a neutral expression and your brain patterns show calm, balanced processing.",
        "message": "How are you feeling today?",
        "prompt": "You seem very centered today. How are you feeling inside?"
    },
    ("neutral", "sad"): {
        "title": "Hidden Sorrow",
        "interpretation": "You appear neutral, but your brain indicates emotional vulnerability or underlying sadness.",
        "message": "What's secretly bothering you?",
        "prompt": "You look composed, but I sense some sadness. Want to talk about it?"
    },
    ("neutral", "happy"): {
        "title": "Quiet Contentment",
        "interpretation": "You maintain a neutral expression, but your brain patterns suggest happiness or contentment.",
        "message": "What's quietly making you happy?",
        "prompt": "You seem quietly happy. What’s been going well for you lately?"
    },
    ("neutral", "angry"): {
        "title": "Suppressed Anger",
        "interpretation": "You look neutral, but your brain shows signs of anger or mental agitation.",
        "message": "What's secretly irritating you?",
        "prompt": "You seem calm, but I sense irritation. Want to get it off your chest?"
    },
    ("neutral", "fear"): {
        "title": "Masked Anxiety",
        "interpretation": "You appear neutral, but your brain indicates intense processing or underlying anxiety.",
        "message": "What's secretly worrying you?",
        "prompt": "You seem okay on the outside, but I sense worry underneath. What’s troubling you?"
    },
    ("neutral", "disgust"): {
        "title": "Concealed Distaste",
        "interpretation": "You maintain a neutral expression, but your brain patterns suggest disgust or aversion.",
        "message": "What's secretly bothering you?",
        "prompt": "You seem neutral, but something feels off. Want to talk about it?"
    },
    ("neutral", "surprise"): {
        "title": "Controlled Amazement",
        "interpretation": "You appear neutral, but your brain is in an alert and processing state.",
        "message": "What's quietly surprising you?",
        "prompt": "You look calm but slightly surprised. Did something unexpected happen?"
    }
}

def generate_session_id() -> str:
    """Generate unique session ID"""
    timestamp = int(datetime.now().timestamp() * 1000)
    unique_id = str(uuid.uuid4())[:8]
    return f"session_{timestamp}_{unique_id}"

def get_emotion_valence(emotion: str) -> str:
    """Get emotional valence (positive/negative/neutral)"""
    positive_emotions = ["happy", "surprise"]
    negative_emotions = ["sad", "angry", "fear", "disgust"]
    
    if emotion.lower() in positive_emotions:
        return "positive"
    elif emotion.lower() in negative_emotions:
        return "negative"
    else:
        return "neutral"

def get_mood_color(mood: str) -> str:
    """Get color for facial mood"""
    mood_colors = {
        "happy": "#4CAF50",
        "sad": "#2196F3", 
        "angry": "#F44336",
        "neutral": "#9E9E9E",
        "fear": "#FF9800",
        "surprise": "#9C27B0",
        "disgust": "#795548"
    }
    return mood_colors.get(mood.lower(), "#9E9E9E")

# MOOD TRACKING ENDPOINTS (Basic CRUD)

@router.get("/", response_model=List[schemas.MoodAnalysisResponse])
def get_mood_entries(
    user_id: str = Query(..., description="Username to get mood entries for"),
    limit: int = Query(100, ge=1, le=1000, description="Number of mood entries to return"),
    offset: int = Query(0, ge=0, description="Number of mood entries to skip"),
    db: Session = Depends(get_db)
):
    """Get all mood analysis entries for a specific user"""
    try:
        # Validate that user exists
        user = db.query(models.User).filter(models.User.username == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")
        
        # Query mood entries for the user
        mood_entries = db.query(models.MoodAnalysis).filter(
            models.MoodAnalysis.user_id == user_id
        ).order_by(desc(models.MoodAnalysis.mood_date)).offset(offset).limit(limit).all()
        
        return mood_entries
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Database error occurred: {str(e)}"
        )

@router.post("/create", response_model=schemas.MoodAnalysisResponse, status_code=status.HTTP_201_CREATED)
def create_mood_analysis(mood_data: schemas.MoodAnalysisCreate, db: Session = Depends(get_db)):
    """Create a new mood analysis entry"""
    try:
        # Validate that user exists
        user = db.query(models.User).filter(models.User.username == mood_data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if entry already exists for this user and date
        existing_entry = db.query(models.MoodAnalysis).filter(
            and_(
                models.MoodAnalysis.user_id == mood_data.user_id,
                models.MoodAnalysis.mood_date == mood_data.mood_date
            )
        ).first()
        
        if existing_entry:
            # Update existing entry instead of creating new one
            existing_entry.mood = mood_data.mood
            existing_entry.combined_mood = mood_data.combined_mood
            existing_entry.eeg_emotional_state = mood_data.eeg_emotional_state
            existing_entry.note = mood_data.note
            
            db.commit()
            db.refresh(existing_entry)
            return existing_entry
        
        # Create new mood analysis entry
        new_mood = models.MoodAnalysis(
            user_id=mood_data.user_id,
            mood_date=mood_data.mood_date,
            mood=mood_data.mood,
            combined_mood=mood_data.combined_mood,
            eeg_emotional_state=mood_data.eeg_emotional_state,
            note=mood_data.note
        )
        
        db.add(new_mood)
        db.commit()
        db.refresh(new_mood)
        
        return new_mood
        
    except HTTPException:
        raise
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Mood entry already exists for this user and date")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating mood analysis: {str(e)}")

@router.put("/update", response_model=schemas.MoodAnalysisResponse)
def update_mood_analysis_by_data(
    mood_data: schemas.MoodAnalysisCreate,
    db: Session = Depends(get_db)
):
    """Update mood analysis entry by user_id and date"""
    try:
        # Find existing entry
        existing_entry = db.query(models.MoodAnalysis).filter(
            and_(
                models.MoodAnalysis.user_id == mood_data.user_id,
                models.MoodAnalysis.mood_date == mood_data.mood_date
            )
        ).first()
        
        if not existing_entry:
            raise HTTPException(status_code=404, detail="Mood entry not found")
        
        # Update the entry
        existing_entry.mood = mood_data.mood
        existing_entry.combined_mood = mood_data.combined_mood
        existing_entry.eeg_emotional_state = mood_data.eeg_emotional_state
        existing_entry.note = mood_data.note
        
        db.commit()
        db.refresh(existing_entry)
        return existing_entry
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating mood analysis: {str(e)}")

@router.post("/save", response_model=schemas.MoodAnalysisResponse)
def save_mood_analysis(mood_data: schemas.MoodAnalysisCreate, db: Session = Depends(get_db)):
    """Save (upsert) mood analysis entry - create new or update existing"""
    try:
        # Validate that user exists
        user = db.query(models.User).filter(models.User.username == mood_data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if entry already exists for this user and date
        existing_entry = db.query(models.MoodAnalysis).filter(
            and_(
                models.MoodAnalysis.user_id == mood_data.user_id,
                models.MoodAnalysis.mood_date == mood_data.mood_date
            )
        ).first()
        
        if existing_entry:
            # Update existing entry
            existing_entry.mood = mood_data.mood
            existing_entry.combined_mood = mood_data.combined_mood
            existing_entry.eeg_emotional_state = mood_data.eeg_emotional_state
            existing_entry.note = mood_data.note
            
            db.commit()
            db.refresh(existing_entry)
            return existing_entry
        else:
            # Create new entry
            new_mood = models.MoodAnalysis(
                user_id=mood_data.user_id,
                mood_date=mood_data.mood_date,
                mood=mood_data.mood,
                combined_mood=mood_data.combined_mood,
                eeg_emotional_state=mood_data.eeg_emotional_state,
                note=mood_data.note
            )
            
            db.add(new_mood)
            db.commit()
            db.refresh(new_mood)
            return new_mood
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving mood analysis: {str(e)}")

@router.get("/filter", response_model=List[schemas.MoodAnalysisResponse])
def filter_mood_entries(
    user_id: str = Query(..., description="Username to filter mood entries for"),
    start_date: Optional[date] = Query(None, description="Start date for filtering (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date for filtering (YYYY-MM-DD)"),
    mood: Optional[str] = Query(None, description="Filter by specific mood"),
    eeg_state: Optional[str] = Query(None, description="Filter by EEG emotional state"),
    limit: int = Query(1000, ge=1, le=1000, description="Number of mood entries to return"),
    offset: int = Query(0, ge=0, description="Number of mood entries to skip"),
    db: Session = Depends(get_db)
):
    """Filter mood analysis entries by various criteria"""
    try:
        # Validate that user exists
        user = db.query(models.User).filter(models.User.username == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User '{user_id}' not found")
        
        # Build query
        query = db.query(models.MoodAnalysis).filter(models.MoodAnalysis.user_id == user_id)
        
        # Apply filters
        if start_date:
            query = query.filter(models.MoodAnalysis.mood_date >= start_date)
        
        if end_date:
            query = query.filter(models.MoodAnalysis.mood_date <= end_date)
        
        if mood:
            query = query.filter(models.MoodAnalysis.mood == mood)
        
        if eeg_state:
            query = query.filter(models.MoodAnalysis.eeg_emotional_state == eeg_state)
        
        # Execute query with pagination
        mood_entries = query.order_by(desc(models.MoodAnalysis.mood_date)).offset(offset).limit(limit).all()
        
        return mood_entries
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# MOOD ANALYSIS ENDPOINTS (Advanced Analysis)

@router.post("/analyze")
async def analyze_mood(request: schemas.MoodAnalysisRequest):
    """Analyze facial emotion and EEG data to provide comprehensive mood insights"""
    try:
        # Convert EEG data to dict
        eeg_dict = {
            "alpha": request.eeg_data.alpha,
            "beta": request.eeg_data.beta,
            "theta": request.eeg_data.theta,
            "delta": request.eeg_data.delta,
            "gamma": request.eeg_data.gamma
        }
        
        # Get dominant EEG band
        dominant_band = max(eeg_dict, key=eeg_dict.get).title()
        
        # Get EEG emotional state with color
        eeg_state_info = EEG_EMOTIONAL_STATE_MAPPING.get(dominant_band, {})
        
        # Get combined mood interpretation
        combined_key = f"{request.facial_emotion.lower()}_{eeg_state_info.get('mood_indicator', '').lower()}",
        combined_interpretation = COMBINED_MOOD_TAG.get((request.facial_emotion.lower(), eeg_state_info.get('mood_indicator', '').lower()), {
            "title": "Complex Emotional State",
            "interpretation": f"Your {request.facial_emotion} expression combined with {eeg_state_info.get('emotional_state', '')} brain patterns.",
            "message": "How are you feeling today?",
            "prompt":f"You appear {request.facial_emotion}, and your brain patterns suggest a sense of {eeg_state_info.get('emotional_state', '')}. How are you feeling right now?"

        })
        
        # Create enhanced mood analysis
        analysis = {
            "session_id": generate_session_id(),
            "facial_analysis": {
                "emotion": request.facial_emotion,
                "title": request.facial_emotion.title(),
                "color": get_mood_color(request.facial_emotion),
                "valence": get_emotion_valence(request.facial_emotion)
            },
            "eeg_analysis": {
                "dominant_band": dominant_band,
                "emotional_state": eeg_state_info.get("emotional_state", "Unknown"),
                "mood_indicator": eeg_state_info.get("mood_indicator", "Unknown"),
                "color": eeg_state_info.get("color", "#808080"),
                "description": eeg_state_info.get("description", "")
            },
            "combined_analysis": {
                "title": combined_interpretation["title"],
                "interpretation": combined_interpretation["interpretation"],
                "combined_mood": combined_key,
                "eeg_emotional_state": eeg_state_info.get("emotional_state", "Unknown"),
                "eeg_color": eeg_state_info.get("color", "#808080"),
                "chatAsk": combined_interpretation["message"],
                "chatbotPrompt":combined_interpretation["prompt"]
            },
            "raw_data": {
                "eeg_frequencies": eeg_dict,
                "dominant_frequency": max(eeg_dict, key=eeg_dict.get),
                "frequency_strength": max(eeg_dict.values())
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "status": "success",
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing mood analysis: {str(e)}")

@router.post("/result", response_model=schemas.MoodAnalysisResponse)
def add_mood_analysis(mood_data: schemas.MoodAnalysisCreate, db: Session = Depends(get_db)):  # ✅ Use MoodAnalysisCreate
    """Create a new mood analysis entry from scan results"""
    try:
        # Debug: Print received data
        print("=== RECEIVED REQUEST DEBUG ===")
        print(f"Raw mood_data: {mood_data}")
        print(f"user_id: {mood_data.user_id} (type: {type(mood_data.user_id)})")
        print(f"mood_date: {mood_data.mood_date} (type: {type(mood_data.mood_date)})")
        print("================================")
        
        # Validate that user exists
        user = db.query(models.User).filter(models.User.username == mood_data.user_id).first()
        if not user:
            print(f"User '{mood_data.user_id}' not found in database")
            raise HTTPException(status_code=404, detail=f"User '{mood_data.user_id}' not found")
        
        print(f"User found: {user.username}")
        
        # Check if entry already exists for this user and date
        existing_entry = db.query(models.MoodAnalysis).filter(
            and_(
                models.MoodAnalysis.user_id == mood_data.user_id,
                models.MoodAnalysis.mood_date == mood_data.mood_date
            )
        ).first()
        
        if existing_entry:
            print(f"Updating existing entry with ID: {existing_entry.id}")
            # Update existing entry instead of creating duplicate
            existing_entry.mood = mood_data.mood
            existing_entry.combined_mood = mood_data.combined_mood
            existing_entry.eeg_emotional_state = mood_data.eeg_emotional_state
            existing_entry.note = mood_data.note
            
            db.commit()
            db.refresh(existing_entry)
            print(f"Successfully updated entry: {existing_entry.id}")
            return existing_entry
        else:
            print("Creating new mood analysis entry")
            # Create new entry
            new_mood = models.MoodAnalysis(
                user_id=mood_data.user_id,
                mood_date=mood_data.mood_date,
                mood=mood_data.mood,
                combined_mood=mood_data.combined_mood,
                eeg_emotional_state=mood_data.eeg_emotional_state,
                note=mood_data.note
            )
            
            db.add(new_mood)
            db.commit()
            db.refresh(new_mood)
            print(f"Successfully created new entry: {new_mood.id}")
            return new_mood
        
    except HTTPException as he:
        print(f"HTTP Exception: {he.detail}")
        db.rollback()
        raise he
    except Exception as e:
        print(f"Database error: {str(e)}")
        print(f"Error type: {type(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating mood analysis: {str(e)}")
