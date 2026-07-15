const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authenticateToken = require('../middlewares/authMiddleware');

const upload = require('../middleware/upload');

// Protect all settings routes
router.use(authenticateToken);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/upload-signature', upload.single('signature'), settingsController.uploadSignature);

module.exports = router;
