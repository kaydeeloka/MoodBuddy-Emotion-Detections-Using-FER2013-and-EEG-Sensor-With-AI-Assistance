CREATE DATABASE mood_db;
CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON mood_db.* TO 'username'@'localhost';
FLUSH PRIVILEGES;

USE mood_db;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,         -- Email as unique identifier
    full_name VARCHAR(255) NOT NULL,
    dob DATE DEFAULT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sender ENUM('user', 'bot') NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE mood_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    mood_date DATE NOT NULL,
    mood VARCHAR(50) NULL,
    combined_mood VARCHAR(255) NULL,
    eeg_emotional_state VARCHAR(100) NULL,
    note TEXT NULL,
    
    CONSTRAINT fk_mood_user FOREIGN KEY (user_id) REFERENCES users(username)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_user_date UNIQUE (user_id, mood_date),
    
    INDEX idx_user_date (user_id, mood_date),
    INDEX idx_mood (mood),
    INDEX idx_eeg_state (eeg_emotional_state)
);






