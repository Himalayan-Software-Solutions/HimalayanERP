const Invoice = require('../models/invoiceModel');

exports.createInvoice = async (req, res) => {
    try {
        const { items, ...invoiceData } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in invoice' });
        }

        // ALWAYS auto-generate invoice number to prevent frontend state from causing duplicates
        invoiceData.invoice_number = await Invoice.generateInvoiceNumber(req.user.business_id);

        const invoiceId = await Invoice.create(invoiceData, items, req.user.business_id);

        res.status(201).json({
            message: 'Invoice created successfully',
            invoiceId,
            invoiceNumber: invoiceData.invoice_number
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getNextInvoiceNumber = async (req, res) => {
    try {
        const nextId = await Invoice.generateInvoiceNumber(req.user.business_id);
        res.json({ invoiceNumber: nextId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Invoice.update(id, req.body, req.user.business_id);
        if (success) {
            res.json({ message: 'Invoice updated successfully' });
        } else {
            res.status(404).json({ error: 'Invoice not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Invoice.delete(id, req.user.business_id);
        if (success) {
            res.json({ message: 'Invoice deleted successfully' });
        } else {
            res.status(404).json({ error: 'Invoice not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await Invoice.findById(id, req.user.business_id);
        if (invoice) {
            res.json(invoice);
        } else {
            res.status(404).json({ error: 'Invoice not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.uploadInvoicePDF = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const { id } = req.params;
        const pdfPath = '/uploads/invoices/' + req.file.filename;

        // Update database with PDF path
        const success = await Invoice.updatePdfPath(id, pdfPath, req.user.business_id);

        if (success) {
            res.json({ message: 'PDF uploaded successfully', pdf_path: pdfPath });
        } else {
            res.status(404).json({ error: 'Invoice not found or update failed' });
        }
    } catch (error) {
        console.error("PDF Upload Error:", error);
        res.status(500).json({ error: 'Internal server error while uploading PDF' });
    }
};

exports.getCustomerByPhone = async (req, res) => {
    try {
        const { phone } = req.params;
        const businessId = req.user.business_id || 1; // Fallback for legacy JWT tokens
        const db = require('../config/db');

        // 1. Check Due Customers
        const [dueRows] = await db.execute(
            'SELECT name as customer_name, phone as customer_phone, address as customer_address, gstin, due_amount FROM due_customers WHERE phone = ? AND business_id = ? LIMIT 1',
            [phone, businessId]
        );
        if (dueRows.length > 0) {
            return res.json(dueRows[0]);
        }

        // 2. Check Invoices
        const [invoiceRows] = await db.execute(
            'SELECT customer_name, customer_phone, customer_address, gstin FROM invoices WHERE customer_phone = ? AND business_id = ? ORDER BY created_at DESC LIMIT 1',
            [phone, businessId]
        );
        if (invoiceRows.length > 0) {
            return res.json({ ...invoiceRows[0], due_amount: 0 });
        }

        return res.json(null);
    } catch (error) {
        console.error("Error fetching customer by phone:", error);
        res.status(500).json({ error: error.message });
    }
};
