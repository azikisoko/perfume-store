require('dotenv').config();
const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./db/db');

// Initialize database
initializeDatabase();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const trackingRoutes = require('./routes/tracking');

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/track', trackingRoutes);

// Fallback route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Perfume store running on port ${PORT}`);
});