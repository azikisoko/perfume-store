const Database = require('better-sqlite3');
const path = require('path');

// Connect to SQLite database file
const db = new Database(path.join(__dirname, '..', 'database.db'));

// Enable foreign keys (SQLite disables them by default)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock_count INTEGER NOT NULL DEFAULT 0,
      image_path TEXT,
      is_preorder INTEGER NOT NULL DEFAULT 0,
      expected_availability_date DATE,
      category_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      tracking_token TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      type TEXT NOT NULL CHECK(type IN ('regular', 'preorder')),
      status TEXT NOT NULL DEFAULT 'Pending Payment' CHECK(status IN (
        'Pending Payment',
        'Awaiting Confirmation',
        'Confirmed',
        'Packed',
        'Ready for Pickup',
        'Rejected'
      )),
      total_amount REAL NOT NULL,
      account_number_shown TEXT NOT NULL,
      paid_claimed_at DATETIME,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default categories if they don't exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (categoryCount.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
    ['Men', 'Women', 'Unisex', 'Gift Sets'].forEach(name => insertCategory.run(name));
    console.log('Default categories seeded');
  }

  console.log('Database initialized successfully');
}

module.exports = { db, initializeDatabase };