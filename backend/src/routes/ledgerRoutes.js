const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', ledgerController.getLedger);
router.get('/stats', ledgerController.getStats);

module.exports = router;
