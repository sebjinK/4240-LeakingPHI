// controllers/entryController.js
const pool = require('../config');

async function getUser(req) {
  const conn = await pool.getConnection();
  const rows = await conn.query(
    'SELECT id, name, email FROM users WHERE id = ?',
    [req.session.userId]
  );
  conn.release();
  return rows.length ? rows[0] : null;
}

// List entries
exports.listEntries = async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.redirect('/login');

    const conn = await pool.getConnection();
    const entries = await conn.query(
      `SELECT
         id,
         date,
         sleep_hours      AS sleepHours,
         water_cups       AS waterCups,
         exercise_minutes AS exerciseMinutes,
         mood,
         notes
       FROM entries
       WHERE user_id = ?
       ORDER BY date DESC`,
      [user.id]
    );
    conn.release();

    res.render('entries', {
      user,
      entries
    });
  } catch (err) {
    console.error('listEntries error:', err);
    res.status(500).send('Could not load entries');
  }
};

// New entry form
exports.showNewEntry = async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.redirect('/login');

    res.render('entry-form', {
      user,
      entry: {},
      errors: [],
      formAction: '/entries/new',
      submitLabel: 'Create Entry'
    });
  } catch (err) {
    console.error('showNewEntry error:', err);
    res.status(500).send('Error loading form');
  }
};

// Create entry
exports.createEntry = async (req, res) => {
  const { date, sleepHours, waterCups, exerciseMinutes, mood, notes } = req.body;

  try {
    const conn = await pool.getConnection();

    await conn.query(
      `INSERT INTO entries
         (user_id, date, sleep_hours, water_cups, exercise_minutes, mood, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        date,
        sleepHours || null,
        waterCups || null,
        exerciseMinutes || null,
        mood || null,
        notes || ''
      ]
    );

    conn.release();

    res.redirect('/entries');
  } catch (err) {
    console.error('createEntry error:', err);
    res.status(500).send('Could not create entry');
  }
};

// Edit entry form
exports.showEditEntry = async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.redirect('/login');

    const conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
         id,
         date,
         sleep_hours      AS sleepHours,
         water_cups       AS waterCups,
         exercise_minutes AS exerciseMinutes,
         mood,
         notes
       FROM entries
       WHERE id = ? AND user_id = ?`,
      [req.params.id, user.id]
    );
    conn.release();

    const entry = rows.length ? rows[0] : null;
    if (!entry) return res.status(404).send('Entry not found');

    if (entry.date) {
      const d = new Date(entry.date);
      entry.date = d.toISOString().split('T')[0];
    }

    Object.keys(entry).forEach(k => {
      if (entry[k] === null) entry[k] = '';
    });

    res.render('entry-form', {
      user,
      entry,
      errors: [],
      formAction: `/entries/${entry.id}/edit`,
      submitLabel: 'Update Entry'
    });
  } catch (err) {
    console.error('showEditEntry error:', err);
    res.status(500).send('Error loading entry');
  }
};

// Update entry
exports.updateEntry = async (req, res) => {
  const { date, sleepHours, waterCups, exerciseMinutes, mood, notes } = req.body;

  try {
    const conn = await pool.getConnection();

    await conn.query(
      `UPDATE entries
       SET date = ?,
           sleep_hours = ?,
           water_cups = ?,
           exercise_minutes = ?,
           mood = ?,
           notes = ?
       WHERE id = ? AND user_id = ?`,
      [
        date,
        sleepHours || null,
        waterCups || null,
        exerciseMinutes || null,
        mood || null,
        notes || '',
        req.params.id,
        req.session.userId
      ]
    );

    conn.release();
    res.redirect('/entries');
    
  } catch (err) {
    console.error('updateEntry error:', err);
    res.status(500).send('Could not update entry');
  }
};

// Delete entry
exports.deleteEntry = async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.query(
      'DELETE FROM entries WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    conn.release();

    res.redirect('/entries');
  } catch (err) {
    console.error('deleteEntry error:', err);
    res.status(500).send('Could not delete entry');
  }
};
