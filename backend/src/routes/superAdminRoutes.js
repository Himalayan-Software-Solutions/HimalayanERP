const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authenticateToken = require('../middlewares/authMiddleware');

const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'SUPERADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Reserved for Super Admin.' });
    }
};

// Protect all routes with authentication and SUPERADMIN role check
router.use(authenticateToken, isSuperAdmin);

router.get('/businesses', superAdminController.getAllBusinesses);
router.post('/businesses', superAdminController.createBusiness);
router.put('/businesses/:id/status', superAdminController.updateBusinessStatus);
router.delete('/businesses/:id', superAdminController.deleteBusiness);
router.put('/businesses/:id/reset-password', superAdminController.resetBusinessPassword);

module.exports = router;
