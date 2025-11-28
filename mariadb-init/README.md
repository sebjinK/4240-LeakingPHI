# MariaDB Initialization Directory

This folder contains the SQL file that initializes the MariaDB schema when the container is first created.

## Files

### **schema.sql**
Defines the following tables:

---

#### `users`
Stores basic account information.
- id  
- name  
- email *(unique)*  
- password_hash  
- created_at  

---

#### `baseline`
Stores initial health and lifestyle baseline data for a user.
- id  
- user_id *(unique)* → References users.id  
- age_years  
- gender  
- height  
- user_weight  
- medical_condition  
- activity_level  
- dietary_preferences  

---

#### `preferences`
Stores personalized activity/exercise preferences.
- id  
- user_id *(unique)* → References users.id  
- intensity  
- exercise_enjoyment  

---

#### `goals`
Tracks the user's wellness goals.
- id  
- user_id *(unique)* → References users.id  
- primary_goal  
- short_goal  
- long_goal  
- days_goal  

---

#### `suggestions`
Stores generated suggestions and user feedback.
- id  
- user_id → References users.id  
- suggestion  
- rating  
- created_at  

---

## Notes
- Each user has only one baseline, preferences, and goals entry (one-to-one relationship).
- Suggestions support multiple entries per user (one-to-many).
- All related user records are automatically deleted if a user is removed (`ON DELETE CASCADE`).

---

### To Reset Schema (Re-run schema.sql)

```sh
docker compose down -v
docker compose up -d
