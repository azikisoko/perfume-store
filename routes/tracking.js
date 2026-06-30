const express = require('express');
const router = express.Router();
const { getOrderByToken } = require('../controllers/trackingController');

// Public tracking route
router.get('/:token', getOrderByToken);

module.exports = router;