const login = (req, res) => res.json({ message: 'login' });
const logout = (req, res) => res.json({ message: 'logout' });
const getAnalytics = (req, res) => res.json({ message: 'getAnalytics' });
const getCategories = (req, res) => res.json({ message: 'getCategories' });
module.exports = { login, logout, getAnalytics, getCategories };
