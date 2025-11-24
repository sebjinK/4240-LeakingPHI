# Controllers Directory

This folder contains all controller logic for the AI Health Habit Tracker.  
Controllers handle database queries, validation, and sending data to the EJS views.

## Files

### **authController.js**
Handles:
- Registering users (with validation + hashed passwords)
- Logging in / verifying credentials
- Logging out
- Rendering login/register pages
- Maintaining user session IDs

Uses the `users` table in MariaDB.

---

### **baselineController.js**
Handles:
- Displaying the baseline goals form
- Loading a user’s existing baseline (if any)
- Creating or updating the baseline record in the `baseline` table
- Redirecting users to the dashboard afterward

---

### **dashboardController.js**
Loads:
- User info  
- Baseline data  
- User’s recent entries  
Then renders the main dashboard page.

---

### **entryController.js**
Full CRUD for health habit entries:
- List entries (`entries` view)
- Show new entry form
- Create entry
- Show edit form
- Update entry
- Delete entry

Uses camelCase fields in JS and snake_case fields in MariaDB.

---

### **aiController.js**
Stub for future AI suggestions.
Currently returns a placeholder JSON response.

---

## Controller Conventions
- Always `await pool.getConnection()`
- Release connections (`conn.release()`)
- Validate user using session ID when needed
- Return clean objects to views (`user`, `entry`, `baseline`)
- Never return raw DB rows directly to EJS
