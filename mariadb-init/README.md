
---

# **mariadb-init/README.md**

# MariaDB Initialization Directory

This folder holds SQL files that automatically initialize the MariaDB schema when the container is first created.

## Files

### **schema.sql**
Defines tables:

#### `users`
- id  
- name  
- email  
- password_hash  
- created_at  

#### `baseline`
- age, height, weight
- goalSleep, goalWater, goalExerciseMinutes
- mood + difficultyPreference  
- Foreign key → users.id

#### `entries`
- date
- sleep_hours
- water_cups
- exercise_minutes
- mood
- notes  
- Foreign key → users.id

## Notes
- The file runs *exactly once* when the MariaDB volume is created.
- To re-run schema.sql, destroy the volume:

```sh
docker compose down -v
docker compose up -d
