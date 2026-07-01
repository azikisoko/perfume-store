const bcrypt = require('bcrypt');
const { db } = require('../db/db');

// POST /api/admin/login
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find admin by username
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create session
    req.session.adminId = admin.id;
    req.session.username = admin.username;

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: { username: admin.username }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/admin/logout
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
}

// GET /api/admin/analytics
function getAnalytics(req, res) {
  try {
    // Revenue per month
    const revenueByMonth = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        SUM(total_amount) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE status NOT IN ('Rejected', 'Pending Payment')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `).all();

    // Most ordered products
    const topProducts = db.prepare(`
      SELECT 
        p.name,
        SUM(oi.quantity) as total_ordered,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status NOT IN ('Rejected', 'Pending Payment')
      GROUP BY p.id
      ORDER BY total_ordered DESC
      LIMIT 10
    `).all();

    // Overall stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'Ready for Pickup' THEN 1 ELSE 0 END) as fulfilled_orders,
        SUM(CASE WHEN status = 'Pending Payment' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'Awaiting Confirmation' THEN 1 ELSE 0 END) as awaiting_confirmation,
        SUM(CASE WHEN type = 'preorder' THEN 1 ELSE 0 END) as total_preorders,
        SUM(CASE WHEN status NOT IN ('Rejected', 'Pending Payment') 
            THEN total_amount ELSE 0 END) as total_revenue
      FROM orders
    `).get();

    res.json({
      success: true,
      data: { revenueByMonth, topProducts, stats }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/admin/categories
function getCategories(req, res) {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { login, logout, getAnalytics, getCategories };