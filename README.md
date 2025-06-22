# MOODBUDDY: EMOTION DETECTION USING FACIAL EXPRESSIONS RECOGNITION \& EEG SENSOR WITH AI ASSISTANCE

MoodBuddy is a mobile application designed to support mental health by helping users track and better understand their emotional well-being. The app uses two separate emotion detection methods: Facial Emotion Recognition (FER), which applies a deep learning model to classify facial expressions, and EEG analysis, where brainwave signals from the Emotiv Epoch X headset (alpha, beta, theta, gamma) are evaluated using a lightweight, threshold-based classification method. These two sources are analyzed independently, and their results are combined to determine the user's final mood, which is then logged into a calendar-based mood tracker with optional notes. 

---

## Directory Structure

```
/moodbuddy/
├── api/                   # FastAPI backend for mood, user, EEG, and chatbot APIs
│   ├── db/                # Database models and schemas
│   ├── eegsensor/         # Cortex API EEG data collection and processing
│   ├── fer2013/           # Facial emotion recognition model and scripts
│   ├── routes/            # API route handlers
│   └── main.py            # Backend entry point
├── app/                   # React Native frontend (Expo)
│   ├── index.tsx          # Initial routing, redirects to login
│   ├── login.tsx          # Login screen
│   ├── signup.tsx         # Signup screen
│   ├── scan-face.tsx      # Facial scan page
│   ├── scan-result.tsx    # Combined result and add-to-calendar
│   ├── calendar.tsx       # Mood calendar
│   ├── insights.tsx       # Mood insights
│   └── (tabs)/            # Tab navigation
├── components/            # Reusable UI components
├── config/
│   └── local.ts           # Configuration for frontend API endpoints—sets the base URL (typically localhost in development) and allows customization of other backend API endpoints.
└── ...
```


---

## Installation

### 1. Backend Setup

```bash
cd api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Set up MySQL and configure the connection in your backend settings 
#make sure you do all step in the configuration section below
uvicorn main:app --reload
```
---

## Configuration

1. **API Base URL:**
    - Change the base URL in `config/local.ts` to your machine’s local IP address so your mobile device can connect to the backend.
    - Find your IP address with `ipconfig` (Windows) or `ifconfig` / `ipconfig getifaddr en0` (macOS).
    - Example:

```ts
export const BASE_URL = 'http://192.168.x.x:8000';
```

2. **Gemini API Key:**
    - Get your Gemini API key from [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key).
    - Add it to your environment variables or config.
3. **Emotiv Cortex API Credentials:**
    - Register as a developer at [Emotiv Developer](https://www.emotiv.com/pages/developer#gRuxdoJ5qg).
    - Obtain your `client_id` and `client_secret` and add them to your config.
4. **MySQL Database:**
    - Start MySQL and ensure the `mood_db` database exists.
    - Run the provided SQL scripts to create the necessary tables.

---

### 2. Frontend Setup

```bash
cd app
npm install
# or
yarn install
```


### 3. Expo Go (Mobile)

- Install [Expo Go](https://expo.dev/client) on your mobile device.
- Run the app:

```bash
npx expo start
```

- Scan the QR code to launch the app.

## Usage Flow

1. **Initial Routing \& Authentication**
    - Scanning the Expo QR code loads `index.tsx`, which redirects to `/login`.
    - Users must log in to access the app. If no account exists, they can sign up.
    - All authentication and user data are connected to the MySQL backend.
2. **Dual-Input Mood Detection**
    - Users can select a date in the calendar or start a new mood entry.
    - The app guides the user through EEG data collection (using the Emotiv Epoch X headset and Cortex API) and facial emotion scanning.
    - EEG results are stored temporarily in AsyncStorage. After scanning, the combined result is shown on the scan-result page.
    - **Manual or automatic mood entries:** Only manual entries or those added via the "Add to Calendar" button are sent to the backend and stored in MySQL.
3. **Mood Calendar \& Insights**
    - The app fetches all mood records from MySQL to display in the calendar and generate insights (trends, statistics, visualizations).
    - Users can manually add moods directly in the calendar; these are immediately stored in MySQL.
4. **Chatbot**
    - The chatbot uses mood data and user context from MySQL to provide personalized responses.

---

## Error Handling

- **Login/Signup errors:** Alerts for invalid credentials or registration issues.
- **EEG/Facial scan errors:** User is notified if device connection or analysis fails.
- **Database/API errors:** App displays error messages for failed backend interactions.

---

## Troubleshooting \& Notes

- Make sure to run MySQL Workbench, then the backend server, then Expo (frontend) in that order.
- Ensure all API keys and credentials are set correctly before running the app.
- Only authenticated users can access main app features.
- "Edit user", "update/delete mood", "add to calendar"-in scan result features are present in the UI but not yet fully implemented.
