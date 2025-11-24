// controllers/authController.js
// authentication logic using MariaDB

const pool = require('../config');
const bcrypt = require('bcrypt');

// ====== RENDER PAGES ======
exports.showLogin = (req, res) => {
  res.render('login', {
    errors: [],
    old: {}
  });
};

exports.showRegister = (req, res) => {
  res.render('register', {
    errors: [],
    old: {}
  });
};

// ====== REGISTER USER ======
exports.registerUser = async (req, res) => {
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

  try {
    const conn = await pool.getConnection();

    // Check existing email
    const existing = await conn.query(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      conn.release();
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

    conn.release();

    // Log user in, then go to baseline
    req.session.userId = Number(result.insertId);
    req.session.save(() => {
      res.redirect('/baseline');
    });
    
  } catch (err) {
    console.error('registerUser error:', err);
    res.status(500).send('Registration failed');
  }
};

// ====== LOGIN USER ======
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).render('login', {
      errors: [{ msg: 'Email and password are required' }],
      old: { email: normalizedEmail }
    });
  }

  try {
    const conn = await pool.getConnection();

    const rows = await conn.query(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    );

    conn.release();

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
    res.redirect('/dashboard');
  } catch (err) {
    console.error('loginUser error:', err);
    res.status(500).send('Login failed');
  }
};

// ====== LOGOUT ======
exports.logoutUser = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
