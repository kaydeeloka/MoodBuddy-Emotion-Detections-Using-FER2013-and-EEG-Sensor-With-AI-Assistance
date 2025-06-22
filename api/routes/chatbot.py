from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, List
import google.generativeai as genai
from sqlalchemy.orm import Session
from routes.moods import COMBINED_MOOD_TAG, EEG_EMOTIONAL_STATE_MAPPING
from db.database import get_db
from db.models import ChatMessage, SenderEnum, User
from db import schemas
from datetime import datetime,timezone
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key="YOUR_GEMINI_API_KEY")
model = genai.GenerativeModel("models/gemini-1.5-flash")

router = APIRouter()

# Keep your excellent emotional keyword mapping
emotional_keywords = {
    "angry": "The user feels angry. Acknowledge their frustration without judgment. Encourage them to talk about what's upsetting them and guide them toward calming techniques.",
    "fear": "The user feels afraid. Offer reassurance and safety. Ask what's causing the fear and gently help them feel heard. Suggest grounding techniques.",
    "disgust": "The user is feeling disgusted or repulsed. Acknowledge the emotion respectfully and ask what triggered it. Guide them toward understanding and processing the experience.",
    "neutral": "The user feels neutral or unsure. Gently ask how their day is going or if something is on their mind. Encourage them to open up without pressure.",
    "happy": "The user feels happy. Celebrate their positive mood, reflect their joy, and encourage them to savor and express gratitude for this moment.",
    "sad": "The user is feeling sad. Respond gently and supportively. Ask open-ended questions to help them express what's making them feel this way. If sadness persists, remind them it's okay to seek help.",
    "surprise": "The user is surprised. Ask if it's a pleasant or unpleasant surprise and respond accordingly with curiosity and empathy.",
}

system_instruction = (
    "Buddy is a warm and therapeutic emotional companion who responds with empathy, kindness, and understanding. "
    "Buddy's role is to provide emotional support like a gentle therapist: sometimes asking caring questions to help the user open up, "
    "especially when they seem unsure or reluctant. Buddy always validates feelings and encourages healthy expression. "
    "If the user still feels unwell after chatting, Buddy should gently suggest seeking support from a professional therapist and offer to help find resources. "
    "Avoid giving multiple options; instead, provide clear, compassionate, and supportive guidance tailored to the user's emotional state."
)

session_history = {}

@router.post("/send", response_model=schemas.ChatbotMessageResponse)
async def chatbot_send(input: schemas.ChatbotInput, db: Session = Depends(get_db)):
    try:
        print("✅ Received from frontend:", input.dict())
        
        # ✅ Convert username to user ID
        user = db.query(User).filter(User.username == input.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user.id  # ✅ Use integer ID
        message = input.message

        # Enhanced emotional context detection
        detected_emotion = None
        message_lower = message.lower()
        for emotion, context in emotional_keywords.items():
            if any(keyword in message_lower for keyword in [emotion, emotion + "ness", "feel " + emotion]):
                detected_emotion = emotion
                break

        # Prepare session prompt with emotional context
        history = session_history.get(input.user_id, [])
        full_prompt = system_instruction + "\n"
        
        if detected_emotion:
            full_prompt += f"Context: {emotional_keywords[detected_emotion]}\n"
        
        for msg in history:
            full_prompt += f"{msg['sender']}: {msg['message']}\n"
        full_prompt += f"user: {message}\nbot:"

        # Get response from Gemini
        response = model.generate_content(full_prompt)
        reply = response.text.strip()

        # Add to in-memory session
        history.append({"sender": "user", "message": message})
        history.append({"sender": "bot", "message": reply})
        session_history[input.user_id] = history

        # ✅ Save both messages using integer user_id
        try:
            user_entry = ChatMessage(
                user_id=user_id,  # ✅ Integer ID
                sender=SenderEnum.user,
                message=message,
                timestamp=datetime.now(timezone.utc)
            )
            bot_entry = ChatMessage(
                user_id=user_id,  # ✅ Integer ID
                sender=SenderEnum.bot,
                message=reply,
                timestamp=datetime.now(timezone.utc)
            )

            db.add(user_entry)
            db.add(bot_entry)
            db.commit()
            db.refresh(bot_entry)
            
            print("✅ Successfully committed to DB for user:", input.user_id)
            
            return schemas.ChatbotMessageResponse(
                reply=reply,
                message_id=bot_entry.id,
                timestamp=bot_entry.timestamp
            )
            
        except Exception as db_error:
            db.rollback()
            print("❌ Database error:", str(db_error))
            return schemas.ChatbotMessageResponse(
                reply=reply,
                message_id=None,
                timestamp=datetime.now(timezone.utc)
            )

    except Exception as e:
        print("❌ Error:", str(e))
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")

# ✅ Updated endpoint: /chatbot/resume (CHATBOT_RESUME)
@router.get("/resume")
def chatbot_resume(request: Request, db: Session = Depends(get_db)):
    user_id = request.query_params.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id parameter is required")
    
    try:
        # First, verify the user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Fetch chat history from database
        chat_history = db.query(ChatMessage).filter(
            ChatMessage.user_id == user_id
        ).order_by(ChatMessage.timestamp.asc()).all()
        
        # Convert to the format your chatbot expects
        history = []
        for message in chat_history:
            history.append({
                "sender": message.sender,
                "message": message.message,
                "timestamp": message.timestamp.isoformat()
            })
        
        # Optional: Also merge with in-memory session if you want to keep both
        memory_history = session_history.get(user_id, [])
        
        return {
            "session": history,
            "memory_session": memory_history,
            "total_messages": len(history)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chat history: {str(e)}")
    
# ✅ Updated endpoint: /chatbot/new (CHATBOT_NEW)
@router.post("/new")
async def chatbot_new(input: schemas.NewSessionInput, db: Session = Depends(get_db)):
    try:
        # Clear in-memory session
        session_history[input.user_id] = []
        
        return {"message": "New conversation started.", "success": True}
    except Exception as e:
        print("❌ Error starting new session:", str(e))
        return {"message": "New conversation started (in memory only).", "success": True}

# ✅ New endpoint: /chatbot/messages (CHAT_MESSAGES)
@router.get("/messages/{username}")
async def get_chatbot_messages(username: str, db: Session = Depends(get_db)):
    """Get chat messages for specific user"""
    try:
        # Convert username to user ID
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        messages = db.query(ChatMessage).filter(
            ChatMessage.user_id == user.id
        ).order_by(ChatMessage.timestamp).all()
        
        return [
            schemas.ChatMessageResponse(
                id=msg.id,
                user_id=msg.user_id,
                sender=msg.sender.value,
                message=msg.message,
                timestamp=msg.timestamp
            )
            for msg in messages
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

# ✅ Updated endpoint: /chatbot/history (CHAT_HISTORY)
@router.get("/history")
def get_chatbot_history(user_id: str, db: Session = Depends(get_db)):
    """Enhanced chat history endpoint"""
    try:
        # Convert username to user ID if needed
        user = db.query(User).filter(User.username == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        messages = db.query(ChatMessage).filter(
            ChatMessage.user_id == user.id
        ).order_by(ChatMessage.timestamp).all()
        
        return [
            {
                "id": m.id,
                "sender": m.sender.value if hasattr(m.sender, 'value') else m.sender,
                "message": m.message,
                "timestamp": m.timestamp.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
            } 
            for m in messages
        ]
    except Exception as e:
        print("❌ Error getting chat history:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")


@router.post("/chat/moodChat", response_model=schemas.ChatMessageResponse)
async def create_mood_chat_message(
    message_data: schemas.ChatMessageMood, 
    db: Session = Depends(get_db)
):
    """Save a mood-based chat message to database"""
    try:
        # Debug logging
        print(f"Creating mood chat message for user_id: {message_data.user_id}")
        
        # Validate user exists
        user = db.query(schemas.User).filter(schemas.User.id == message_data.user_id).first()
        if not user:
            print(f"User with ID {message_data.user_id} not found")
            raise HTTPException(
                status_code=404, 
                detail=f"User with ID {message_data.user_id} not found"
            )
        
        print(f"User found: {user.username}")
        
        # Create new chat message - sender is fixed as 'bot'
        new_message = schemas.ChatMessageMood(
            user_id=message_data.user_id,
            sender=schemas.SenderEnum.bot,  # Use enum for type safety
            message=message_data.message
        )
        
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        
        print(f"Mood chat message created successfully with ID: {new_message.id}")
        return new_message
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        db.rollback()
        raise he
    except Exception as e:
        # Handle unexpected errors
        db.rollback()
        print(f"Unexpected error saving mood chat message: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: Unable to save mood chat message"
        )
