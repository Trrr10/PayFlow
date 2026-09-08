const express = require('express');
const router = express.Router();
const { getWallet, getTransactions, adminWalletAdjustment } = require('../controllers/walletController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/', authenticateToken, getWallet);
router.get('/transactions', authenticateToken, getTransactions);
router.post('/admin/wallet-adjustment', authenticateToken, requireAdmin, adminWalletAdjustment);

module.exports = router;
