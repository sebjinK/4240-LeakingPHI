const pool = require('../config');
const express = require('express');

async function general(req, res) {
    let user = null;
    if (req.session.userId) {
        try {
            const conn = await pool.getConnection();
            const rows = await conn.query('SELECT id, name, email FROM users WHERE id = ?', [req.session.userId]);
            if (conn) { conn.release(); }
            if (rows.length > 0) {
                user = rows[0];
            }
        } catch (err) {
            console.error('Error fetching user for / route:', err);
            // Fail gracefully
        }
    }
    res.render('index', { user });
};

module.exports = { general };