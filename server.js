const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

const app = express();

// ====== VIEW ENGINE & STATIC FILES ======
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ====== SESSION CONFIG ======
app.use(
  session({
    secret: 'super-secret-key-change-me', // TODO: use env variable in real app
    resave: false,
    saveUninitialized: false
  })
);

// ====== IN-MEMORY DATA (REPLACE WITH MARIA DB LATER) ======
// TODO: Replace these with actual MariaDB models or queries
let users = []; // { id, name, email, passwordHash, baseline }
let entries = []; // { id, userId, date, sleepHours, waterCups, exerciseMinutes, mood, notes }

// Helper to simulate autoincrement
let userIdCounter = 1;
let entryIdCounter = 1;

// ====== AUTH MIDDLEWARE ======
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// ====== ROUTES ======

// Landing page
app.get('/', (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  res.render('index', { user });
});

// ---------- REGISTER ----------
app.get('/register', (req, res) => {
  res.render('register', { errors: [], old: {} });
});

app.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { name, email, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render('register', {
        errors: errors.array(),
        old: { name, email }
      });
    }

    // Check if email already exists
    const existingUser = users.find(u => u.email === email.toLowerCase());
    if (existingUser) {
      return res.status(400).render('register', {
        errors: [{ msg: 'Email already in use' }],
        old: { name, email }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      id: userIdCounter++,
      name,
      email: email.toLowerCase(),
      passwordHash,
      baseline: null // will be filled after baseline questions
    };
    users.push(newUser);

    req.session.userId = newUser.id;
    res.redirect('/baseline');
  }
);

// ---------- LOGIN ----------
app.get('/login', (req, res) => {
  res.render('login', { errors: [], old: {} });
});

app.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { email, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render('login', {
        errors: errors.array(),
        old: { email }
      });
    }

    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(400).render('login', {
        errors: [{ msg: 'Invalid email or password' }],
        old: { email }
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).render('login', {
        errors: [{ msg: 'Invalid email or password' }],
        old: { email }
      });
    }

    req.session.userId = user.id;

    // If baseline not set, send to baseline, else to dashboard
    if (!user.baseline) {
      return res.redirect('/baseline');
    }
    res.redirect('/dashboard');
  }
);

// ---------- LOGOUT ----------
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ---------- BASELINE QUESTIONS ----------
app.get('/baseline', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  res.render('baseline', {
    user,
    errors: [],
    old: user.baseline || {}
  });
});

// Static questions:
// - goalSleep
// - goalWater (cups)
// - goalExerciseMinutes
// - goalMood
// - difficultyPreference (1-10)
app.post(
  '/baseline',
  requireAuth,
  [
    body('goalSleep')
      .isFloat({ min: 3, max: 12 })
      .withMessage('Sleep goal should be between 3 and 12 hours'),
    body('goalWater')
      .isInt({ min: 1, max: 30 })
      .withMessage('Water goal should be between 1 and 30 cups'),
    body('goalExerciseMinutes')
      .isInt({ min: 0, max: 300 })
      .withMessage('Exercise goal should be between 0 and 300 minutes'),
    body('goalMood')
      .isInt({ min: 1, max: 10 })
      .withMessage('Mood target should be between 1 and 10'),
    body('difficultyPreference')
      .isInt({ min: 1, max: 10 })
      .withMessage('Difficulty preference should be between 1 and 10')
  ],
  (req, res) => {
    const errors = validationResult(req);
    const user = users.find(u => u.id === req.session.userId);
    const old = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render('baseline', {
        user,
        errors: errors.array(),
        old
      });
    }

    user.baseline = {
      goalSleep: parseFloat(req.body.goalSleep),
      goalWater: parseInt(req.body.goalWater),
      goalExerciseMinutes: parseInt(req.body.goalExerciseMinutes),
      goalMood: parseInt(req.body.goalMood),
      difficultyPreference: parseInt(req.body.difficultyPreference)
    };

    res.redirect('/dashboard');
  }
);

// ---------- DASHBOARD ----------
app.get('/dashboard', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  const userEntries = entries.filter(e => e.userId === user.id);

  res.render('dashboard', {
    user,
    baseline: user.baseline,
    entries: userEntries
  });
});

// ---------- CRUD: ENTRIES ----------

// List entries
app.get('/entries', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  const userEntries = entries.filter(e => e.userId === user.id);
  res.render('entries', { user, entries: userEntries });
});

// New entry form
app.get('/entries/new', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  res.render('entry-form', {
    user,
    entry: {},
    errors: [],
    formAction: '/entries/new',
    submitLabel: 'Create Entry'
  });
});

// Create entry
app.post(
  '/entries/new',
  requireAuth,
  [
    body('date').isISO8601().withMessage('Please select a valid date'),
    body('sleepHours')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0, max: 24 })
      .withMessage('Sleep hours must be between 0 and 24'),
    body('waterCups')
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 50 })
      .withMessage('Water cups must be between 0 and 50'),
    body('exerciseMinutes')
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 600 })
      .withMessage('Exercise minutes must be between 0 and 600'),
    body('mood')
      .optional({ checkFalsy: true })
      .isInt({ min: 1, max: 10 })
      .withMessage('Mood must be between 1 and 10')
  ],
  (req, res) => {
    const errors = validationResult(req);
    const user = users.find(u => u.id === req.session.userId);
    const entryData = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render('entry-form', {
        user,
        entry: entryData,
        errors: errors.array(),
        formAction: '/entries/new',
        submitLabel: 'Create Entry'
      });
    }

    const newEntry = {
      id: entryIdCounter++,
      userId: user.id,
      date: req.body.date,
      sleepHours: req.body.sleepHours ? parseFloat(req.body.sleepHours) : null,
      waterCups: req.body.waterCups ? parseInt(req.body.waterCups) : null,
      exerciseMinutes: req.body.exerciseMinutes ? parseInt(req.body.exerciseMinutes) : null,
      mood: req.body.mood ? parseInt(req.body.mood) : null,
      notes: req.body.notes || ''
    };

    entries.push(newEntry);
    res.redirect('/entries');
  }
);

// Edit entry form
app.get('/entries/:id/edit', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  const entry = entries.find(e => e.id === parseInt(req.params.id) && e.userId === user.id);

  if (!entry) {
    return res.status(404).send('Entry not found');
  }

  res.render('entry-form', {
    user,
    entry,
    errors: [],
    formAction: `/entries/${entry.id}/edit`,
    submitLabel: 'Update Entry'
  });
});

// Update entry
app.post(
  '/entries/:id/edit',
  requireAuth,
  [
    body('date').isISO8601().withMessage('Please select a valid date'),
    body('sleepHours')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0, max: 24 })
      .withMessage('Sleep hours must be between 0 and 24'),
    body('waterCups')
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 50 })
      .withMessage('Water cups must be between 0 and 50'),
    body('exerciseMinutes')
      .optional({ checkFalsy: true })
      .isInt({ min: 0, max: 600 })
      .withMessage('Exercise minutes must be between 0 and 600'),
    body('mood')
      .optional({ checkFalsy: true })
      .isInt({ min: 1, max: 10 })
      .withMessage('Mood must be between 1 and 10')
  ],
  (req, res) => {
    const errors = validationResult(req);
    const user = users.find(u => u.id === req.session.userId);
    const entry = entries.find(e => e.id === parseInt(req.params.id) && e.userId === user.id);

    if (!entry) {
      return res.status(404).send('Entry not found');
    }

    const entryData = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render('entry-form', {
        user,
        entry: Object.assign({}, entry, entryData),
        errors: errors.array(),
        formAction: `/entries/${entry.id}/edit`,
        submitLabel: 'Update Entry'
      });
    }

    entry.date = req.body.date;
    entry.sleepHours = req.body.sleepHours ? parseFloat(req.body.sleepHours) : null;
    entry.waterCups = req.body.waterCups ? parseInt(req.body.waterCups) : null;
    entry.exerciseMinutes = req.body.exerciseMinutes ? parseInt(req.body.exerciseMinutes) : null;
    entry.mood = req.body.mood ? parseInt(req.body.mood) : null;
    entry.notes = req.body.notes || '';

    res.redirect('/entries');
  }
);

// Delete entry
app.post('/entries/:id/delete', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  const entryId = parseInt(req.params.id);
  entries = entries.filter(e => !(e.id === entryId && e.userId === user.id));
  res.redirect('/entries');
});

// ---------- FUTURE: LLM SUGGESTIONS (STUB) ----------
// This is a placeholder POST route that would:
/// 1. Read the user's baseline + recent entries
/// 2. Send them to an LLM
/// 3. Get back a suggestion and difficulty rating
/// 4. Allow user to adjust desired difficulty (1-10)
//
// Currently: just returns a dummy JSON response.
app.post('/suggestions', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);

  // Example of what we’ll send in future:
  const payloadForLLM = {
    baseline: user.baseline,
    latestEntry: entries
      .filter(e => e.userId === user.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null,
    desiredDifficulty: user.baseline?.difficultyPreference || 5
  };

  // TODO: Replace with OpenAI / other LLM call
  res.json({
    message: 'LLM integration not implemented yet. This is a stub.',
    payloadForLLM
  });
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Health Habit Tracker running on http://localhost:${PORT}`);
});