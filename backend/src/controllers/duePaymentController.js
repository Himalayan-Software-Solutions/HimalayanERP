const DuePayment = require('../models/duePaymentModel');

exports.getAllDueCustomers = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        const customers = await DuePayment.getAllDueCustomers(businessId);
        res.json(customers);
    } catch (error) {
        console.error('Error fetching due customers:', error);
        res.status(500).json({ message: 'Error fetching due customers' });
    }
};

exports.addDueCustomer = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        const customerData = { ...req.body, business_id: businessId };
        const newId = await DuePayment.addDueCustomer(customerData);
        res.status(201).json({ id: newId, message: 'Due customer added successfully' });
    } catch (error) {
        console.error('Error adding due customer:', error);
        require('fs').writeFileSync('api_error.log', error.stack || error.message);
        res.status(500).json({ message: 'Error adding due customer', error: error.message });
    }
};

exports.updateDueCustomer = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        const { id } = req.params;
        const success = await DuePayment.updateDueCustomer(id, businessId, req.body);
        if (success) {
            res.json({ message: 'Due customer updated successfully' });
        } else {
            res.status(404).json({ message: 'Due customer not found' });
        }
    } catch (error) {
        console.error('Error updating due customer:', error);
        res.status(500).json({ message: 'Error updating due customer' });
    }
};

exports.deleteDueCustomer = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        const { id } = req.params;
        const success = await DuePayment.deleteDueCustomer(id, businessId);
        if (success) {
            res.json({ message: 'Due customer deleted successfully' });
        } else {
            res.status(404).json({ message: 'Due customer not found' });
        }
    } catch (error) {
        console.error('Error deleting due customer:', error);
        res.status(500).json({ message: 'Error deleting due customer' });
    }
};

exports.addPayment = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        const { id } = req.params;
        const { amount, payment_mode, notes } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount' });
        }

        const result = await DuePayment.addPayment(id, businessId, amount, payment_mode, notes);
        res.json({ message: 'Payment recorded successfully', newDueAmount: result.newDueAmount });
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ message: error.message || 'Error recording payment' });
    }
};

exports.getPaymentHistory = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        const { id } = req.params;
        const history = await DuePayment.getPaymentHistory(id, businessId);
        res.json(history);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ message: 'Error fetching payment history' });
    }
};
