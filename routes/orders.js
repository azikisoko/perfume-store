const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  createOrder,
  claimPayment,
  updateEmail,
  getOrderByToken,
  getAllOrders,
  confirmOrder,
  rejectOrder,
  markPacked,
} = require('../controllers/orderController');

// Public routes (customers)
router.post('/', createOrder);
router.post('/:token/claim', claimPayment);
router.post('/:token/email', updateEmail);
router.get('/track/:token', getOrderByToken);

// Admin routes (protected)
router.get('/', requireAdmin, getAllOrders);
router.put('/:id/confirm', requireAdmin, confirmOrder);
router.put('/:id/reject', requireAdmin, rejectOrder);
router.put('/:id/packed', requireAdmin, markPacked);

module.exports = router;