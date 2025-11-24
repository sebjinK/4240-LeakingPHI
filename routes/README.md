
---

# 📁 **routes/README.md**

# Routes Directory

This folder holds all Express route modules.  
Routes connect URLs → controllers.

## Route Groups

### **generalRoutes.js**
- Landing page `/`
- Sends `{ user: req.session.userId }` to index.ejs

---

### **authRoutes.js**
- `/login` GET + POST
- `/register` GET + POST
- `/logout`

Uses functions from `authController.js`.

---

### **baselineRoutes.js**
- `/baseline` GET + POST
Protected by `requireAuth`.

Uses `baselineController.js`.

---

### **dashboardRoutes.js**
- `/dashboard`
Protected by `requireAuth`.

Loads user data, baseline, and entries.

---

### **entryRoutes.js**
CRUD for `/entries`:
- List entries
- Add new entry
- Edit entry
- Delete entry

All routes require authentication.

---

### **aiRoutes.js**
- `/suggestions` (POST)
Currently uses stub logic in `aiController`.

---

## Route Conventions
- All routes are mounted in `server.js` with:
```js
app.use('/', someRoutes);

