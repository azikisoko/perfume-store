const { db } = require('../db/db');

function generateOrderNumber() {
  const result = db.prepare('SELECT COUNT(*) as count FROM orders').get();
  const nextNumber = result.count + 1;
  return `ORD-${String(nextNumber).padStart(5, '0')}`;
}

module.exports = { generateOrderNumber };