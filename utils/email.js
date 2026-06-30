const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Order confirmation email to customer
async function sendOrderConfirmationEmail(order, orderItems) {
  if (!order.customer_email) return;

  const itemsList = orderItems.map(item =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">₦${item.unit_price.toLocaleString()}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">₦${item.subtotal.toLocaleString()}</td>
    </tr>`
  ).join('');

  const trackingUrl = `${process.env.SITE_URL}/track.html?token=${order.tracking_token}`;

  await transporter.sendMail({
    from: `"Perfume Store" <${process.env.EMAIL_USER}>`,
    to: order.customer_email,
    subject: `Order ${order.order_number} - Payment Received`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you, ${order.customer_name}!</h2>
        <p>We've received your payment claim for order <strong>${order.order_number}</strong>. 
        We're verifying your payment and will notify you once confirmed.</p>
        
        <h3>Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Product</th>
              <th style="padding: 8px; text-align: left;">Qty</th>
              <th style="padding: 8px; text-align: left;">Price</th>
              <th style="padding: 8px; text-align: left;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsList}</tbody>
        </table>
        <p><strong>Total: ₦${order.total_amount.toLocaleString()}</strong></p>

        <h3>Track Your Order</h3>
        <p>Use this link anytime to check your order status:</p>
        <a href="${trackingUrl}" style="
          display: inline-block;
          padding: 12px 24px;
          background: #000;
          color: #fff;
          text-decoration: none;
          border-radius: 4px;
        ">Track Order ${order.order_number}</a>

        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Questions? Call us or visit the store.
        </p>
      </div>
    `,
  });
}

// Notify admin when customer clicks "I've Paid"
async function sendAdminNotificationEmail(order, orderItems) {
  const itemsList = orderItems.map(item =>
    `- ${item.product_name} x${item.quantity} @ ₦${item.unit_price.toLocaleString()} = ₦${item.subtotal.toLocaleString()}`
  ).join('\n');

  await transporter.sendMail({
    from: `"Perfume Store" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `New Payment Claim - Order ${order.order_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Payment Claim</h2>
        <p><strong>Order:</strong> ${order.order_number}</p>
        <p><strong>Customer:</strong> ${order.customer_name}</p>
        <p><strong>Phone:</strong> ${order.customer_phone}</p>
        <p><strong>Type:</strong> ${order.type}</p>
        <p><strong>Total:</strong> ₦${order.total_amount.toLocaleString()}</p>
        <p><strong>Account Used:</strong> ${order.account_number_shown}</p>
        <h3>Items:</h3>
        <pre>${itemsList}</pre>
        <p>Log into the dashboard to confirm or reject this order.</p>
      </div>
    `,
  });
}

// Notify customer when order is packed and ready
async function sendPackedEmail(order) {
  if (!order.customer_email) return;

  const trackingUrl = `${process.env.SITE_URL}/track.html?token=${order.tracking_token}`;

  await transporter.sendMail({
    from: `"Perfume Store" <${process.env.EMAIL_USER}>`,
    to: order.customer_email,
    subject: `Order ${order.order_number} - Ready for Pickup!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your order is ready! 🎉</h2>
        <p>Hi ${order.customer_name}, your order <strong>${order.order_number}</strong> 
        has been packed and is ready for pickup.</p>
        <p>Please come to the store at your convenience.</p>
        <a href="${trackingUrl}" style="
          display: inline-block;
          padding: 12px 24px;
          background: #000;
          color: #fff;
          text-decoration: none;
          border-radius: 4px;
        ">View Order Status</a>
      </div>
    `,
  });
}

module.exports = {
  sendOrderConfirmationEmail,
  sendAdminNotificationEmail,
  sendPackedEmail,
};