const Purchase = require('../models/purchaseModel');

const purchaseController = {
    // 1. Get all purchases for a business
    getAllPurchases: async (req, res) => {
        try {
            const businessId = req.user.business_id;
            const purchases = await Purchase.getAllByBusiness(businessId);
            res.json(purchases);
        } catch (error) {
            console.error('Error fetching purchases:', error);
            res.status(500).json({ error: 'Failed to fetch purchases' });
        }
    },

    // 2. Get single purchase by ID
    getPurchaseById: async (req, res) => {
        try {
            const businessId = req.user.business_id;
            const purchaseId = req.params.id;
            const purchase = await Purchase.getById(purchaseId, businessId);

            if (!purchase) {
                return res.status(404).json({ error: 'Purchase not found' });
            }
            res.json(purchase);
        } catch (error) {
            console.error('Error fetching purchase:', error);
            res.status(500).json({ error: 'Failed to fetch purchase details' });
        }
    },

    // 3. Create a new purchase
    createPurchase: async (req, res) => {
        try {
            const businessId = req.user.business_id;
            const purchaseData = req.body;

            // Basic Validation
            if (!purchaseData.supplier_name || !purchaseData.items || purchaseData.items.length === 0) {
                return res.status(400).json({ error: 'Supplier name and at least one item are required.' });
            }

            const purchaseId = await Purchase.create(businessId, purchaseData);

            res.status(201).json({
                message: 'Purchase recorded successfully! Stock and MRP updated.',
                purchaseId
            });
        } catch (error) {
            console.error('Error recording purchase:', error);
            res.status(500).json({ error: 'Failed to record purchase' });
        }
    },

    // 4. Delete a purchase
    deletePurchase: async (req, res) => {
        try {
            const businessId = req.user.business_id;
            const purchaseId = req.params.id;
            
            await Purchase.delete(purchaseId, businessId);
            res.json({ message: 'Purchase deleted successfully and stock reverted.' });
        } catch (error) {
            console.error('Error deleting purchase:', error);
            if (error.message === 'Purchase not found') {
                return res.status(404).json({ error: 'Purchase not found' });
            }
            res.status(500).json({ error: 'Failed to delete purchase' });
        }
    }
};

module.exports = purchaseController;
