const getAllProducts = (req, res) => res.json({ message: 'getAllProducts' });
const getProductById = (req, res) => res.json({ message: 'getProductById' });
const getProductsByCategory = (req, res) => res.json({ message: 'getProductsByCategory' });
const createProduct = (req, res) => res.json({ message: 'createProduct' });
const updateProduct = (req, res) => res.json({ message: 'updateProduct' });
const deleteProduct = (req, res) => res.json({ message: 'deleteProduct' });
module.exports = { getAllProducts, getProductById, getProductsByCategory, createProduct, updateProduct, deleteProduct };
