const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/dashboard', reportController.getDashboardStats);
router.get('/sales-chart', reportController.getSalesChartData);

module.exports = router;
