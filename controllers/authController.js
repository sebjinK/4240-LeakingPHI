// controllers/authController.js
// authentication logic using MariaDB

const pool = require('../config');
const bcrypt = require('bcrypt');

// ====== RENDER PAGES ======
function showLogin(req, res) {
  res.render('login', {
    errors: [],
    old: {}
  });
};

function showRegister(req, res) {
  res.render('register', {
    errors: [],
    old: {}
  });
};

// ====== REGISTER USER ======
async function registerUser(req, res) {
  const { name, email, password, confirmPassword } = req.body;

  const normalizedEmail = (email || '').trim().toLowerCase();

  // Simple validation like the old in-memory version
  if (!name || name.trim().length < 2) {
    return res.status(400).render('register', {
      errors: [{ msg: 'Name must be at least 2 characters long' }],
      old: { name, email: normalizedEmail }
    });
  }
  if (!normalizedEmail) {
    return res.status(400).render('register', {
      errors: [{ msg: 'Please enter a valid email' }],
      old: { name, email: normalizedEmail }
    });
  }
  if (!password || password.length < 6) {
    return res.status(400).render('register', {
      errors: [{ msg: 'Password must be at least 6 characters long' }],
      old: { name, email: normalizedEmail }
    });
  }
  if (password !== confirmPassword) {
    return res.status(400).render('register', {
      errors: [{ msg: 'Passwords do not match' }],
      old: { name, email: normalizedEmail }
    });
  }

  const conn = await pool.getConnection();

  try {

    // Check existing email
    const existing = await conn.query(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(400).render('register', {
        errors: [{ msg: 'Email already in use' }],
        old: { name, email: normalizedEmail }
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await conn.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, hash]
    );

    // Log user in, then go to dashboard
    req.session.userId = Number(result.insertId);
    req.session.save(() => {
      res.redirect('/dashboard');
    });

  } catch (err) {
    console.error('registerUser error:', err);
    res.status(500).send('Registration failed');
  } finally {
    conn.release();
  }
};

// ====== LOGIN USER ======
async function loginUser(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).render('login', {
      errors: [{ msg: 'Email and password are required' }],
      old: { email: normalizedEmail }
    });
  }

  const conn = await pool.getConnection();
  try {


    const rows = await conn.query(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(400).render('login', {
        errors: [{ msg: 'Invalid credentials' }],
        old: { email: normalizedEmail }
      });
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).render('login', {
        errors: [{ msg: 'Invalid credentials' }],
        old: { email: normalizedEmail }
      });
    }

    req.session.userId = user.id;
    return res.redirect('/dashboard');

  } catch (err) {
    console.error('loginUser error:', err);
    res.status(500).send('Login failed');
  } finally {
    conn.release();
  }
};

// ====== LOGOUT ======
function logoutUser(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};


// ====== EXPORT ALL ======
module.exports = {
  showLogin,
  showRegister,
  registerUser,
  loginUser,
  logoutUser
};
