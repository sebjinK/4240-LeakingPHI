# Middleware Directory

This folder contains Express middleware functions used across the app.

## Files

### **auth.js**
Middleware that enforces authentication.

Behavior:
- If `req.session.userId` exists → continue
- Otherwise → redirect to `/login`

Used in routes that require login:
```js
router.get('/dashboard', requireAuth, ...)
