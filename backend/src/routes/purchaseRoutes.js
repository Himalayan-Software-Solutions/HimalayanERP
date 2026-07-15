const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const authenticateToken = require('../middlewares/authMiddleware');

router.get('/', authenticateToken, purchaseController.getAllPurchases);
router.get('/:id', authenticateToken, purchaseController.getPurchaseById);
router.post('/', authenticateToken, purchaseController.createPurchase);

module.exports = router;
