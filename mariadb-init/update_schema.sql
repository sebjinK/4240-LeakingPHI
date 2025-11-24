-- mariadb-init/update_schema.sql

CREATE TABLE IF NOT EXISTS prompt_engineer_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    age INT,
    gender VARCHAR(255),
    height DECIMAL(5,2),
    height_units VARCHAR(10),
    weight DECIMAL(5,2),
    weight_units VARCHAR(10),
    medical_conditions TEXT,
    difficulty INT,
    activity_level VARCHAR(255),
    exercise_enjoyment VARCHAR(255),
    dietary_restrictions TEXT,
    primary_goal TEXT,
    short_term_goals TEXT,
    long_term_goals TEXT,
    days_per_week INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
