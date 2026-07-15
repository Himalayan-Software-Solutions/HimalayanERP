const express = require('express');
const router = express.Router();
const duePaymentController = require('../controllers/duePaymentController');
const authenticateToken = require('../middlewares/authMiddleware');

// Protect all routes
router.use(authenticateToken);

// 1. Get all due customers
router.get('/', duePaymentController.getAllDueCustomers);

// 2. Add a new due customer
router.post('/', duePaymentController.addDueCustomer);

// 3. Update due customer
router.put('/:id', duePaymentController.updateDueCustomer);

// 4. Delete due customer
router.delete('/:id', duePaymentController.deleteDueCustomer);

// 5. Add a payment
router.post('/:id/pay', duePaymentController.addPayment);

// 6. Get payment history
router.get('/:id/history', duePaymentController.getPaymentHistory);

module.exports = router;
