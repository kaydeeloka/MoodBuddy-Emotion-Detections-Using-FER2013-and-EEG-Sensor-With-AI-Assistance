//Configuration for frontend api endpoints connecting with backend
const API_CONFIG = {
  // Development URLs 'http://localhost:8000' //change this to your local dev server
  DEVELOPMENT: 'http://localhost:8000', //univ
};

// Change this single line to switch environments
export const BASE_URL = API_CONFIG.DEVELOPMENT;

// Feature-specific endpoints for your mood tracker app
export const API_ENDPOINTS = {
  // Authentication
  GET_USER: '/users',
  LOGIN: '/users/login',
  SIGNUP: '/users/signup',
  EDIT_USER:'users/edit',

  // Mood tracking
  MOODS: '/moods',                    // GET - List all moods for user
  NEW_MOOD: '/mood/create',             // POST - Create new mood entry  
  SAVE_MOOD: '/moods/save',           // POST - Upsert mood (create or update)
  MOODS_FILTER: '/moods/filter',      // GET - Filter moods by criteria and print in insight.tsx
  
  // Advanced Analysis Operations  
  MOOD_ANALYZE: '/moods/analyze',
  MOOD_RESULT: '/moods/result',     // Add to database the mood analysis result
  
  // AI Face prediction
  FACE_ANALYSIS: '/facial_emotion',
  
  // EEG connection
  EEG_CONNECT: '/eeg/connect',
  EEG_BANDPOWER: '/eeg/bandpower',
  EEG_STATUS: '/eeg/status',
  EEG_AVAILABLE:'/eeg/available', //check availability of headset
  EEG_STARTDATA: '/eeg/start-collection',
  EEG_STOPDATA: '/eeg/stop-collection',
  EEG_DISCONNECT: '/eeg/disconnect',

  // AI chatbot
  CHATBOT_SEND: '/chatbot/send',
  CHATBOT_RESUME: '/chatbot/resume',
  CHATBOT_NEW: '/chatbot/new',
  CHAT_MESSAGES: '/chatbot/messages',
  MOOD_CHAT:'/chatbot/moodChat'
};

// Helper function
export const getApiUrl = (endpoint: string) => {
  return `${BASE_URL}${endpoint}`;
};
