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

// ====== SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fitness Buddy running on http://localhost:${PORT}`);
});
