const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  login,
  logout,
  getAnalytics,
  getCategories,
} = require('../controllers/adminController');

// Auth routes
router.post('/login', login);
router.post('/logout', requireAdmin, logout);

// Analytics (protected)
router.get('/analytics', requireAdmin, getAnalytics);

// Categories (protected)
router.get('/categories', requireAdmin, getCategories);

module.exports = router;