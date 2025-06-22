from datetime import date
from typing import Optional
from sqlalchemy import ( Column, DateTime, Integer, String, Text, ForeignKey, Date, Enum, UniqueConstraint, func)
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from db.database import Base  # Adjust based on your structure


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    dob = Column(Date, nullable=True)
    password = Column(String(255), nullable=False)

    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")

    mood_analysis = relationship(
        "MoodAnalysis",
        back_populates="user",
        cascade="all, delete-orphan",
        primaryjoin="User.username == MoodAnalysis.user_id"
    )

class MoodAnalysis(Base):
    __tablename__ = "mood_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey("users.username"), nullable=False, index=True)
    mood_date = Column(Date, nullable=False)
    mood = Column(String(50), nullable=True)  
    combined_mood = Column(String(255), nullable=True)
    eeg_emotional_state = Column(String(100), nullable=True)  
    note = Column(Text, nullable=True)
    
    # Relationship
    user = relationship("User", back_populates="mood_analysis", foreign_keys=[user_id])
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'mood_date', name='uq_user_date'),
    )

class SenderEnum(PyEnum):
    user = "user"
    bot = "bot"

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # ✅ Fixed to use Integer and proper FK
    sender = Column(Enum(SenderEnum), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user = relationship("User", back_populates="chat_messages")