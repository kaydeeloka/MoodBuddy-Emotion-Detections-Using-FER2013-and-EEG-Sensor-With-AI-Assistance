SELECT * FROM mood_db.users;

-- Insert users (based on the usernames from your mood data)
INSERT INTO users (id, username, email, full_name, password) VALUES
(2, 'janedoe', 'jane.doe@example.com', 'Jane Doe', 'jane'),
(3, 'kaydee', 'kay.dee@example.com', 'KayDee Hello', 'kaydee');

SELECT * FROM mood_db.mood_analysis;

INSERT INTO mood_analysis (user_id, mood_date, mood, combined_mood, eeg_emotional_state, note) VALUES
('kaydee', '2025-04-08', 'sad', 'sad_combined', 'Emotional Vulnerability', 'Sample note 2'),
('kaydee', '2025-04-15', 'neutral', 'neutral_combined', 'Subconscious Processing', 'Sample note 3'),
('kaydee', '2025-04-22', 'angry', 'angry_combined', 'Mental Agitation', 'Sample note 4'),
('kaydee', '2025-04-29', 'fear', 'fear_combined', 'Intense Processing', 'Sample note 5'),
('kaydee', '2025-05-01', 'disgust', 'disgust_combined', 'Peaceful Contentment', 'Sample note 6'),
('kaydee', '2025-05-08', 'surprise', 'surprise_combined', 'Emotional Vulnerability', 'Sample note 7'),
('kaydee', '2025-05-15', 'happy', 'happy_combined', 'Subconscious Processing', 'Sample note 1'),
('kaydee', '2025-05-22', 'sad', 'sad_combined', 'Mental Agitation', 'Sample note 2'),
('kaydee', '2025-05-29', 'neutral', 'neutral_combined', 'Intense Processing', 'Sample note 3'),
('kaydee', '2025-06-01', 'angry', 'angry_combined', 'Peaceful Contentment', 'Sample note 4'),
('kaydee', '2025-06-08', 'fear', 'fear_combined', 'Emotional Vulnerability', 'Sample note 5'),
('kaydee', '2025-06-15', 'disgust', 'disgust_combined', 'Subconscious Processing', 'Sample note 6'),
('kaydee', '2025-06-22', 'surprise', 'surprise_combined', 'Mental Agitation', 'Sample note 7'),
('kaydee', '2025-06-29', 'happy', 'happy_combined', 'Intense Processing', 'Sample note 1');

SELECT * FROM mood_db.chat_messages;

-- Insert chat messages for both users
INSERT INTO chat_messages (user_id, sender, message, timestamp) VALUES
-- Conversation for janedoe (user_id = 1)
(1, 'user', 'Hi there!', '2025-04-01 08:30:00'),
(1, 'bot', 'Hello! How are you feeling today?', '2025-04-01 08:30:05'),
(1, 'user', 'I am feeling really angry about what happened at work', '2025-04-01 08:31:00'),
(1, 'bot', 'I understand you are feeling angry. Would you like to tell me more about what happened?', '2025-04-01 08:31:10'),
(1, 'user', 'What happened?', '2025-04-01 08:32:00'),
(1, 'bot', 'I have recorded your mood as angry for today. Is there anything else you would like to share?', '2025-04-01 08:32:15'),

(1, 'user', 'Yesterday was really tough', '2025-04-02 09:15:00'),
(1, 'bot', 'I am sorry to hear that. How are you feeling right now?', '2025-04-02 09:15:10'),
(1, 'user', 'Sadness', '2025-04-02 09:16:00'),
(1, 'bot', 'Thank you for sharing. I have noted that you are feeling sad today.', '2025-04-02 09:16:20'),

(1, 'user', 'Today feels different', '2025-04-03 10:00:00'),
(1, 'bot', 'That is good to hear! How would you describe your mood today?', '2025-04-03 10:00:15'),
(1, 'user', 'nothing special, just neutral', '2025-04-03 10:01:00'),
(1, 'bot', 'Neutral is perfectly fine. Sometimes we need those calm days.', '2025-04-03 10:01:25'),

(1, 'user', 'I am so frustrated again!', '2025-04-04 14:20:00'),
(1, 'bot', 'I can sense your frustration. What is making you feel this way?', '2025-04-04 14:20:10'),
(1, 'user', 'Angry', '2025-04-04 14:21:00'),
(1, 'bot', 'I have recorded your angry mood. Would you like some tips for managing anger?', '2025-04-04 14:21:30'),

(1, 'user', 'Everything is going wrong today', '2025-04-05 16:45:00'),
(1, 'bot', 'I am sorry you are having a difficult day. How are you feeling?', '2025-04-05 16:45:15'),
(1, 'user', 'Messed up', '2025-04-05 16:46:00'),
(1, 'bot', 'It sounds like you are feeling angry. I have noted this for today.', '2025-04-05 16:46:20'),

(1, 'user', 'Wow! Something amazing happened today!', '2025-04-06 11:30:00'),
(1, 'bot', 'That sounds wonderful! I can tell you are excited. How are you feeling?', '2025-04-06 11:30:10'),
(1, 'user', 'Woww this is so good', '2025-04-06 11:31:00'),
(1, 'bot', 'I am so happy to hear that! I have recorded your surprised mood.', '2025-04-06 11:31:25'),

(1, 'user', 'Finally it runs!', '2025-04-12 13:15:00'),
(1, 'bot', 'Congratulations! You sound very happy about this achievement.', '2025-04-12 13:15:10'),
(1, 'user', 'Yes, I am so happy right now', '2025-04-12 13:16:00'),
(1, 'bot', 'That is fantastic! I have recorded your happy mood for today.', '2025-04-12 13:16:20'),

-- Conversation for kaydee (user_id = 2)
(2, 'user', 'Hello bot', '2025-04-13 07:45:00'),
(2, 'bot', 'Hello! How are you feeling today?', '2025-04-13 07:45:05'),
(2, 'user', 'Done with my tasks for today', '2025-04-13 07:46:00'),
(2, 'bot', 'That sounds productive! How would you describe your mood?', '2025-04-13 07:46:15'),
(2, 'user', 'Just neutral, nothing special', '2025-04-13 07:47:00'),
(2, 'bot', 'Thank you for sharing. I have noted your neutral mood.', '2025-04-13 07:47:20'),

(2, 'user', 'Something feels off today', '2025-04-14 12:30:00'),
(2, 'bot', 'I am sorry to hear that. Can you tell me more about how you are feeling?', '2025-04-14 12:30:10'),
(2, 'user', 'dont know, just disgusted by everything', '2025-04-14 12:31:00'),
(2, 'bot', 'I understand you are feeling disgusted. I have recorded this for today.', '2025-04-14 12:31:25'),

(2, 'user', 'wow', '2025-04-15 15:20:00'),
(2, 'bot', 'You sound surprised! What happened?', '2025-04-15 15:20:05'),
(2, 'user', 'Something unexpected happened', '2025-04-15 15:21:00'),
(2, 'bot', 'Surprises can be exciting! I have noted your surprised mood.', '2025-04-15 15:21:15'),

(2, 'user', 'Feeling good today!', '2025-06-07 09:00:00'),
(2, 'bot', 'That is wonderful to hear! Tell me more about your mood.', '2025-06-07 09:00:10'),
(2, 'user', 'Feeling good', '2025-06-07 09:01:00'),
(2, 'bot', 'I am so glad you are feeling happy! I have recorded this positive mood.', '2025-06-07 09:01:20'),

(2, 'user', 'good morning', '2025-06-08 08:15:00'),
(2, 'bot', 'Good morning! How are you feeling today?', '2025-06-08 08:15:05'),
(2, 'user', 'good', '2025-06-08 08:16:00'),
(2, 'bot', 'Great to hear you are feeling good! I have noted your happy mood.', '2025-06-08 08:16:15'),

(2, 'user', 'Another good day', '2025-06-09 10:30:00'),
(2, 'bot', 'I am happy to see you are having consecutive good days! How are you feeling?', '2025-06-09 10:30:10'),
(2, 'user', 'good', '2025-06-09 10:31:00'),
(2, 'bot', 'Consistency in positive moods is wonderful! I have recorded your happy mood.', '2025-06-09 10:31:20'),

(2, 'user', 'Still feeling great', '2025-06-10 11:45:00'),
(2, 'bot', 'That is amazing! You seem to be on a positive streak. How are you feeling today?', '2025-06-10 11:45:10'),
(2, 'user', 'good', '2025-06-10 11:46:00'),
(2, 'bot', 'I love seeing this positive trend in your moods! Keep it up!', '2025-06-10 11:46:25'),

-- Some recent conversations
(1, 'user', 'How has my mood been lately?', '2025-06-18 14:00:00'),
(1, 'bot', 'Let me check your recent mood entries. You have had a mix of emotions, with some challenging days but also some positive moments. Would you like me to show you a summary?', '2025-06-18 14:00:15'),
(1, 'user', 'Yes, that would be helpful', '2025-06-18 14:01:00'),
(1, 'bot', 'Based on your recent entries, I can see patterns in your mood changes. Remember, it is normal to have ups and downs. Is there anything specific you would like to discuss?', '2025-06-18 14:01:30'),

(2, 'user', 'Thanks for tracking my moods', '2025-06-19 20:00:00'),
(2, 'bot', 'You are very welcome! I am here to help you understand your emotional patterns. How are you feeling right now?', '2025-06-19 20:00:10'),
(2, 'user', 'Pretty good, thanks for asking', '2025-06-19 20:01:00'),
(2, 'bot', 'I am glad to hear that! Feel free to check in anytime you want to log your mood or just chat.', '2025-06-19 20:01:20');
