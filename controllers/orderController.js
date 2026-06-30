const createOrder = (req, res) => res.json({ message: 'createOrder' });
const claimPayment = (req, res) => res.json({ message: 'claimPayment' });
const updateEmail = (req, res) => res.json({ message: 'updateEmail' });
const getOrderByToken = (req, res) => res.json({ message: 'getOrderByToken' });
const getAllOrders = (req, res) => res.json({ message: 'getAllOrders' });
const confirmOrder = (req, res) => res.json({ message: 'confirmOrder' });
const rejectOrder = (req, res) => res.json({ message: 'rejectOrder' });
const markPacked = (req, res) => res.json({ message: 'markPacked' });
module.exports = { createOrder, claimPayment, updateEmail, getOrderByToken, getAllOrders, confirmOrder, rejectOrder, markPacked };
