const { db } = require('../db/db');

function getOrderByToken(req, res) {
  try {
    const order = db.prepare(`
      SELECT 
        order_number, tracking_token, customer_name,
        type, status, total_amount, created_at, updated_at
      FROM orders WHERE tracking_token = ?
    `).get(req.params.token);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const orderItems = db.prepare(`
      SELECT oi.quantity, oi.unit_price, oi.subtotal, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = (SELECT id FROM orders WHERE tracking_token = ?)
    `).all(req.params.token);

    res.json({
      success: true,
      data: { ...order, items: orderItems }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { getOrderByToken };