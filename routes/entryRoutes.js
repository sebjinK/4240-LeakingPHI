// routes/entryRoutes.js
// routes for managing entries
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const {
  listEntries,
  showNewEntry,
  createEntry,
  showEditEntry,
  updateEntry,
  deleteEntry
} = require('../controllers/entryController');

router.get('/entries', requireAuth, listEntries);
router.get('/entries/new', requireAuth, showNewEntry);
router.post('/entries/new', requireAuth, createEntry);
router.get('/entries/:id/edit', requireAuth, showEditEntry);
router.post('/entries/:id/edit', requireAuth, updateEntry);
router.post('/entries/:id/delete', requireAuth, deleteEntry);

module.exports = router;
