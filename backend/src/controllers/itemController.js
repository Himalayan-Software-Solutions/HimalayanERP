const Item = require('../models/itemModel');

exports.getAllItems = async (req, res) => {
    try {
        const { search, category, lowStock } = req.query;
        const business_id = req.user.business_id;
        const items = await Item.findAll({ search, category, lowStock: lowStock === 'true', business_id });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getItemById = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id, req.user.business_id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createItem = async (req, res) => {
    try {
        const itemId = await Item.create({ ...req.body, business_id: req.user.business_id });
        res.status(201).json({ message: 'Item created successfully', itemId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateItem = async (req, res) => {
    try {
        const success = await Item.update(req.params.id, { ...req.body, business_id: req.user.business_id });
        if (!success) return res.status(404).json({ error: 'Item not found' });
        res.json({ message: 'Item updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        const success = await Item.delete(req.params.id, req.user.business_id);
        if (!success) return res.status(404).json({ error: 'Item not found' });
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
