// server.js
// main server file for Fitness Buddy
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const requireAuth = require('./middleware/auth');


//const generalRoutes = require('./routes/generalRoutes');
const authRoutes = require('./routes/authRoutes');
const baselineRoutes = require('./routes/baselineRoutes');
const promptEngineerRoutes = require('./routes/promptEngineerRoutes');
const promptEngineerController = require('./controllers/promptEngineerController');

const app = express();

// ====== VIEW ENGINE ======
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ====== MIDDLEWARE ======
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this",
    resave: false,
    saveUninitialized: false
  })
);

app.get('/', (req, res) => {
  // If user is logged in, redirect to dashboard
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  // Otherwise, show landing page (login/register prompt)
  res.render('landing'); // make sure landing.ejs exists
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard'); // your dashboard.ejs
});




// ====== ROUTES ======
//app.use('/', generalRoutes);
app.use('/', authRoutes);
app.use('/', baselineRoutes);
app.use('/', promptEngineerRoutes);

// Temporary debug route: bypass auth and run dailyPrompt for testing
// WARNING: remove or protect this in production
// Debug route (optional). Enable by setting DEBUG_ENABLE=true in env.
if (process.env.DEBUG_ENABLE === 'true') {
  app.post('/debug/daily', express.json(), async (req, res) => {
    try {
      // set a test user id here that exists in your DB
      req.session.userId = process.env.DEBUG_TEST_USER_ID || 1;
      return await promptEngineerController.dailyPrompt(req, res);
    } catch (err) {
      console.error('debug/daily error', err);
      res.status(500).json({ ok: false, error: 'debug failed' });
    }
  });
  console.log('[server] DEBUG /debug/daily route enabled');
  // Simple debug test page for browser-based testing
  app.get('/debug/test-page', (req, res) => {
    try {
      res.render('debug-test');
    } catch (err) {
      res.status(500).send('Failed to render test page');
    }
  });
  console.log('[server] DEBUG /debug/test-page route enabled');
}

// ====== SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fitness Buddy running on http://localhost:${PORT}`);
});
