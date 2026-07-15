const db = require('../config/db');

class Item {
    static async create(itemData) {
        const {
            name, category, hsn_code, unit, mrp, purchase_price, selling_price,
            opening_stock, current_stock, gst_percent, min_stock_alert, business_id
        } = itemData;

        const query = `
        INSERT INTO items (
            name, category, hsn_code, unit, mrp, purchase_price, selling_price, 
            opening_stock, current_stock, gst_percent, min_stock_alert, business_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const params = [
            name, category, hsn_code, unit, mrp, purchase_price, selling_price,
            opening_stock || 0, current_stock || opening_stock || 0, gst_percent, min_stock_alert, business_id
        ];

        const [result] = await db.execute(query, params);
        return result.insertId;
    }

    static async findAll(filters = {}) {
        let query = 'SELECT * FROM items WHERE business_id = ?';
        const params = [filters.business_id];

        if (filters.search) {
            query += ' AND (name LIKE ? OR hsn_code LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.category) {
            query += ' AND category = ?';
            params.push(filters.category);
        }

        if (filters.lowStock) {
            query += ' AND current_stock <= min_stock_alert';
        }

        query += ' ORDER BY name ASC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async findById(id, business_id) {
        const query = 'SELECT * FROM items WHERE id = ? AND business_id = ?';
        const [rows] = await db.execute(query, [id, business_id]);
        return rows[0];
    }

    static async update(id, itemData) {
        const {
            name, category, hsn_code, unit, mrp, purchase_price, selling_price,
            gst_percent, min_stock_alert, business_id
        } = itemData;

        const query = `
        UPDATE items SET 
            name=?, category=?, hsn_code=?, unit=?, mrp=?, purchase_price=?, selling_price=?, 
            gst_percent=?, min_stock_alert=?
        WHERE id=? AND business_id=?
    `;

        const [result] = await db.execute(query, [
            name, category, hsn_code, unit, mrp, purchase_price, selling_price,
            gst_percent, min_stock_alert, id, business_id
        ]);
        return result.affectedRows > 0;
    }

    static async updateStock(id, newStock, business_id) {
        const query = 'UPDATE items SET current_stock = ? WHERE id = ? AND business_id = ?';
        const [result] = await db.execute(query, [newStock, id, business_id]);
        return result.affectedRows > 0;
    }

    static async delete(id, business_id) {
        const query = 'DELETE FROM items WHERE id = ? AND business_id = ?';
        const [result] = await db.execute(query, [id, business_id]);
        return result.affectedRows > 0;
    }
}

module.exports = Item;
