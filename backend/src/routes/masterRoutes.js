const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/categories', masterController.getCategories);
router.post('/categories', masterController.addCategory);

router.get('/units', masterController.getUnits);
router.post('/units', masterController.addUnit);

module.exports = router;
