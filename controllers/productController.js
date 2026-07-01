const { db } = require('../db/db');
const path = require('path');
const fs = require('fs');

// GET /api/products
function getAllProducts(req, res) {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `).all();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/products/:id
function getProductById(req, res) {
  try {
    const product = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/products/category/:categoryId
function getProductsByCategory(req, res) {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ?
      ORDER BY p.created_at DESC
    `).all(req.params.categoryId);

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/products (admin only)
function createProduct(req, res) {
  try {
    const {
      name,
      description,
      price,
      stock_count,
      image_path,
      is_preorder,
      expected_availability_date,
      category_id,
    } = req.body;

    // Validate required fields
    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        error: 'Name, price and category are required'
      });
    }

    // Confirm category exists
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    const result = db.prepare(`
      INSERT INTO products (
        name, description, price, stock_count, image_path,
        is_preorder, expected_availability_date, category_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      description || null,
      price,
      stock_count || 0,
      image_path || null,
      is_preorder ? 1 : 0,
      expected_availability_date || null,
      category_id
    );

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// PUT /api/products/:id (admin only)
function updateProduct(req, res) {
  try {
    const {
      name,
      description,
      price,
      stock_count,
      image_path,
      is_preorder,
      expected_availability_date,
      category_id,
    } = req.body;

    // Confirm product exists
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    db.prepare(`
      UPDATE products SET
        name = ?,
        description = ?,
        price = ?,
        stock_count = ?,
        image_path = ?,
        is_preorder = ?,
        expected_availability_date = ?,
        category_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      price || existing.price,
      stock_count !== undefined ? stock_count : existing.stock_count,
      image_path !== undefined ? image_path : existing.image_path,
      is_preorder !== undefined ? (is_preorder ? 1 : 0) : existing.is_preorder,
      expected_availability_date !== undefined ? expected_availability_date : existing.expected_availability_date,
      category_id || existing.category_id,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// DELETE /api/products/:id (admin only)
function deleteProduct(req, res) {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
};