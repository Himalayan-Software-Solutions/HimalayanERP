const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authenticateToken = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure Multer Storage for Invoices
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use absolute path relative to this file (src/routes/invoiceRoutes.js)
        // ../../uploads/invoices
        cb(null, path.join(__dirname, '../../uploads/invoices/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.use(authenticateToken);

router.post('/', invoiceController.createInvoice);
router.get('/next-number', invoiceController.getNextInvoiceNumber);
router.get('/customer/:phone', invoiceController.getCustomerByPhone);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);
router.post('/:id/pdf', upload.single('pdf'), invoiceController.uploadInvoicePDF);

module.exports = router;
