require('dotenv').config();
const bcrypt = require('bcrypt');
const { db, initializeDatabase } = require('../db/db');

async function seedAdmins() {
  initializeDatabase();

  // Define your two admin accounts here
  const admins = [
    { username: 'admin1', password: 'password1' },
    { username: 'admin2', password: 'password2' },
  ];

  for (const admin of admins) {
    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(admin.username);
    if (existing) {
      console.log(`Admin "${admin.username}" already exists, skipping`);
      continue;
    }

    const hash = await bcrypt.hash(admin.password, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(admin.username, hash);
    console.log(`Admin "${admin.username}" created successfully`);
  }

  console.log('Done');
  process.exit(0);
}

seedAdmins();