-- mariadb-init/schema.sql

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS baseline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    UNIQUE user_id INT NOT NULL,
    age_years INT,
    gender VARCHAR (36),
    height VARCHAR (36),
    user_weight VARCHAR (36),
    medical_condition VARCHAR (255),
    activity_level VARCHAR (36),
    dietary_preferences VARCHAR (255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    UNIQUE user_id INT NOT NULL,
    intensity INT,
    exercise_enjoyment VARCHAR (255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    UNIQUE user_id INT NOT NULL,
    primary_goal VARCHAR (255),
    short_goal VARCHAR (255),
    long_goal VARCHAR (255),
    days_goal INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    UNIQUE user_id INT NOT NULL,
    suggestion VARCHAR (4500),
    rating VARCHAR (10),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

