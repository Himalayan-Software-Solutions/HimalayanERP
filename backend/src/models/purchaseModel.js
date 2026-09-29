const db = require('../config/db');

class Purchase {
    static async getAllByBusiness(businessId) {
        const query = `
            SELECT p.*,
            (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) as item_count,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('name', item_name, 'qty', quantity))
                FROM purchase_items pi WHERE pi.purchase_id = p.id
            ) as items_summary
            FROM purchases p
            WHERE p.business_id = ?
            ORDER BY p.purchase_date DESC
        `;
        const [rows] = await db.execute(query, [businessId]);
        return rows;
    }

    static async getById(purchaseId, businessId) {
        // 1. Get Purchase
        const [purchases] = await db.execute('SELECT * FROM purchases WHERE id = ? AND business_id = ?', [purchaseId, businessId]);
        if (purchases.length === 0) return null;
        const purchase = purchases[0];

        // 2. Get Items
        const [items] = await db.execute('SELECT *, COALESCE(purchase_price, mrp) as purchase_price FROM purchase_items WHERE purchase_id = ?', [purchaseId]);
        purchase.items = items;

        return purchase;
    }

    static async create(businessId, purchaseData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const { supplier_name, supplier_phone, supplier_gstin, total_amount, purchase_date, items } = purchaseData;

            let formattedDate = purchase_date;
            if (purchase_date && typeof purchase_date === 'string' && purchase_date.length === 10) {
                formattedDate = `${purchase_date} 12:00:00`;
            } else if (!purchase_date) {
                formattedDate = new Date();
            }

            // 1. Insert Purchase
            const [purchaseResult] = await connection.execute(
                `INSERT INTO purchases (business_id, supplier_name, supplier_phone, supplier_gstin, total_amount, purchase_date)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [businessId, supplier_name, supplier_phone || null, supplier_gstin || null, total_amount, formattedDate]
            );
            const purchaseId = purchaseResult.insertId;

            // 2. Insert Items & Update Stock/Purchase Price
            for (const item of items) {
                const price = parseFloat(item.purchase_price !== undefined && item.purchase_price !== null && item.purchase_price !== '' ? item.purchase_price : item.mrp) || 0;

                // Insert into purchase_items
                await connection.execute(
                    `INSERT INTO purchase_items (purchase_id, item_id, item_name, hsn_code, quantity, mrp, purchase_price, amount)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [purchaseId, item.item_id || null, item.name || item.item_name || '', item.hsn_code || null, item.quantity, price, price, item.amount]
                );

                // If it's a known item, update its stock and purchase_price
                if (item.item_id) {
                    await connection.execute(
                        `UPDATE items 
                         SET current_stock = current_stock + ?, purchase_price = ? 
                         WHERE id = ? AND business_id = ?`,
                        [item.quantity, price, item.item_id, businessId]
                    );
                }
            }

            await connection.commit();
            return purchaseId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async update(purchaseId, businessId, purchaseData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Verify purchase exists and belongs to business
            const [purchases] = await connection.execute(
                'SELECT * FROM purchases WHERE id = ? AND business_id = ?',
                [purchaseId, businessId]
            );
            if (purchases.length === 0) {
                throw new Error('Purchase not found');
            }

            const { supplier_name, supplier_phone, supplier_gstin, total_amount, purchase_date, items } = purchaseData;

            // 2. Fetch existing items to revert stock
            const [existingItems] = await connection.execute(
                'SELECT item_id, quantity FROM purchase_items WHERE purchase_id = ?',
                [purchaseId]
            );

            for (const item of existingItems) {
                if (item.item_id) {
                    await connection.execute(
                        `UPDATE items 
                         SET current_stock = GREATEST(0, current_stock - ?) 
                         WHERE id = ? AND business_id = ?`,
                        [item.quantity, item.item_id, businessId]
                    );
                }
            }

            // 3. Delete old purchase items
            await connection.execute('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId]);

            // 4. Update purchase header
            let formattedDate = purchase_date;
            if (purchase_date && typeof purchase_date === 'string' && purchase_date.length === 10) {
                formattedDate = `${purchase_date} 12:00:00`;
            } else if (!purchase_date) {
                formattedDate = new Date();
            }

            await connection.execute(
                `UPDATE purchases 
                 SET supplier_name = ?, supplier_phone = ?, supplier_gstin = ?, total_amount = ?, purchase_date = ? 
                 WHERE id = ? AND business_id = ?`,
                [supplier_name, supplier_phone || null, supplier_gstin || null, total_amount, formattedDate, purchaseId, businessId]
            );

            // 5. Insert new items & adjust stock/purchase_price
            for (const item of items) {
                const price = parseFloat(item.purchase_price !== undefined && item.purchase_price !== null && item.purchase_price !== '' ? item.purchase_price : item.mrp) || 0;

                await connection.execute(
                    `INSERT INTO purchase_items (purchase_id, item_id, item_name, hsn_code, quantity, mrp, purchase_price, amount)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [purchaseId, item.item_id || null, item.name || item.item_name || '', item.hsn_code || null, item.quantity, price, price, item.amount]
                );

                if (item.item_id) {
                    await connection.execute(
                        `UPDATE items 
                         SET current_stock = current_stock + ?, purchase_price = ? 
                         WHERE id = ? AND business_id = ?`,
                        [item.quantity, price, item.item_id, businessId]
                    );
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(purchaseId, businessId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Verify purchase belongs to business
            const [purchases] = await connection.execute('SELECT * FROM purchases WHERE id = ? AND business_id = ?', [purchaseId, businessId]);
            if (purchases.length === 0) {
                throw new Error('Purchase not found');
            }

            // 2. Fetch all items
            const [items] = await connection.execute('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId]);

            // 3. Decrement stock for each item that exists
            for (const item of items) {
                if (item.item_id) {
                    await connection.execute(
                        `UPDATE items 
                         SET current_stock = GREATEST(0, current_stock - ?)
                         WHERE id = ? AND business_id = ?`,
                        [item.quantity, item.item_id, businessId]
                    );
                }
            }

            // 4. Delete purchase items
            await connection.execute('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId]);

            // 5. Delete purchase
            await connection.execute('DELETE FROM purchases WHERE id = ?', [purchaseId]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Purchase;
