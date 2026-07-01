const { db } = require('../db/db');
const { generateOrderNumber } = require('../utils/generateOrderNumber');
const { generateToken } = require('../utils/generateToken');
const {
  sendOrderConfirmationEmail,
  sendAdminNotificationEmail,
  sendPackedEmail,
} = require('../utils/email');

// POST /api/orders
async function createOrder(req, res) {
  try {
    const { customer_name, customer_phone, items } = req.body;

    // Validate required fields
    if (!customer_name || !customer_phone || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone and items are required'
      });
    }

    // Separate regular and preorder items
    const regularItems = [];
    const preorderItems = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);

      if (!product) {
        return res.status(400).json({
          success: false,
          error: `Product ${item.product_id} not found`
        });
      }

      // Check stock for regular items
      if (!product.is_preorder && product.stock_count < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name}`
        });
      }

      const orderItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal: product.price * item.quantity,
        is_preorder: product.is_preorder,
      };

      if (product.is_preorder) {
        preorderItems.push(orderItem);
      } else {
        regularItems.push(orderItem);
      }
    }

    // Generate session ID to link split orders
    const sessionId = generateToken();
    const createdOrders = [];

    // Helper to create a single order
    const createSingleOrder = (orderItems, type) => {
      const orderNumber = generateOrderNumber();
      const trackingToken = generateToken();
      const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const accountNumber = type === 'preorder'
        ? `${process.env.PREORDER_BANK_NAME} - ${process.env.PREORDER_ACCOUNT_NUMBER} (${process.env.PREORDER_ACCOUNT_NAME})`
        : `${process.env.REGULAR_BANK_NAME} - ${process.env.REGULAR_ACCOUNT_NUMBER} (${process.env.REGULAR_ACCOUNT_NAME})`;

      // Insert order
      const orderResult = db.prepare(`
        INSERT INTO orders (
          order_number, tracking_token, customer_name, customer_phone,
          type, total_amount, account_number_shown, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderNumber,
        trackingToken,
        customer_name,
        customer_phone,
        type,
        totalAmount,
        accountNumber,
        sessionId
      );

      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of orderItems) {
        insertItem.run(orderId, item.product_id, item.quantity, item.unit_price, item.subtotal);

        // Deduct stock for regular items only
        if (type === 'regular') {
          db.prepare('UPDATE products SET stock_count = stock_count - ? WHERE id = ?')
            .run(item.quantity, item.product_id);
        }
      }

      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      return { order, orderItems };
    };

    // Create orders based on cart contents
    if (regularItems.length > 0) {
      createdOrders.push(createSingleOrder(regularItems, 'regular'));
    }

    if (preorderItems.length > 0) {
      createdOrders.push(createSingleOrder(preorderItems, 'preorder'));
    }

    res.status(201).json({
      success: true,
      message: createdOrders.length > 1
        ? 'Your cart has been split into a regular order and a preorder'
        : 'Order created successfully',
      data: createdOrders.map(({ order, orderItems }) => ({
        order_number: order.order_number,
        tracking_token: order.tracking_token,
        type: order.type,
        total_amount: order.total_amount,
        account_number_shown: order.account_number_shown,
        items: orderItems,
        session_id: sessionId,
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/orders/:token/claim
async function claimPayment(req, res) {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE tracking_token = ?')
      .get(req.params.token);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'Pending Payment') {
      return res.status(400).json({
        success: false,
        error: 'Payment already claimed for this order'
      });
    }

    // Update order status
    db.prepare(`
      UPDATE orders SET
        status = 'Awaiting Confirmation',
        paid_claimed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE tracking_token = ?
    `).run(req.params.token);

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE tracking_token = ?')
      .get(req.params.token);

    // Get order items for email
    const orderItems = db.prepare(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(updatedOrder.id);

    // Notify admin
    try {
      await sendAdminNotificationEmail(updatedOrder, orderItems);
    } catch (emailError) {
    console.error('Admin email failed:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Payment claimed successfully. We will verify and confirm shortly.',
      data: { order_number: updatedOrder.order_number }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/orders/:token/email
async function updateEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE tracking_token = ?')
      .get(req.params.token);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Save email
    db.prepare(`
      UPDATE orders SET
        customer_email = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE tracking_token = ?
    `).run(email, req.params.token);

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE tracking_token = ?')
      .get(req.params.token);

    // Get order items for confirmation email
    const orderItems = db.prepare(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(updatedOrder.id);

    // Send confirmation email to customer
    try {
      await sendOrderConfirmationEmail(updatedOrder, orderItems);
    } catch (emailError) {
    console.error('Confirmation email failed:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Email saved. Confirmation email sent.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/orders/track/:token (public)
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

// GET /api/orders (admin only)
function getAllOrders(req, res) {
  try {
    const { type, status } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const orders = db.prepare(query).all(...params);

    // Attach items to each order
    const ordersWithItems = orders.map(order => {
      const items = db.prepare(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id);
      return { ...order, items };
    });

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// PUT /api/orders/:id/confirm (admin only)
function confirmOrder(req, res) {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'Awaiting Confirmation') {
      return res.status(400).json({
        success: false,
        error: 'Order is not awaiting confirmation'
      });
    }

    db.prepare(`
      UPDATE orders SET
        status = 'Confirmed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    res.json({ success: true, message: 'Order confirmed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// PUT /api/orders/:id/reject (admin only)
function rejectOrder(req, res) {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Restore stock for regular orders
    if (order.type === 'regular') {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      for (const item of items) {
        db.prepare('UPDATE products SET stock_count = stock_count + ? WHERE id = ?')
          .run(item.quantity, item.product_id);
      }
    }

    db.prepare(`
      UPDATE orders SET
        status = 'Rejected',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    res.json({ success: true, message: 'Order rejected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// PUT /api/orders/:id/packed (admin only)
async function markPacked(req, res) {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        error: 'Order must be confirmed before packing'
      });
    }

    db.prepare(`
      UPDATE orders SET
        status = 'Ready for Pickup',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

    // Notify customer
    try {
      await sendPackedEmail(updatedOrder);
    } catch (emailError) {
    console.error('Packed email failed:', emailError.message);
    }

    res.json({ success: true, message: 'Order marked as packed and ready for pickup' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  createOrder,
  claimPayment,
  updateEmail,
  getOrderByToken,
  getAllOrders,
  confirmOrder,
  rejectOrder,
  markPacked,
};