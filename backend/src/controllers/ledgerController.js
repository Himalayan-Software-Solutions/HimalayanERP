const db = require('../config/db');

exports.getLedger = async (req, res) => {
    try {
        const { search, startDate, endDate } = req.query;
        const business_id = req.user.business_id;

        let query = `
        SELECT l.*, COALESCE(i.customer_name, c.name) as customer_name, i.invoice_number 
        FROM ledger l
        LEFT JOIN customers c ON l.customer_id = c.id
        LEFT JOIN invoices i ON l.invoice_id = i.id
        WHERE l.business_id = ?
    `;

        const params = [business_id];
        const conditions = [];

        if (search) {
            conditions.push(`(COALESCE(i.customer_name, c.name) LIKE ? OR i.invoice_number LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }

        if (startDate && endDate) {
            conditions.push(`l.transaction_date BETWEEN ? AND ?`);
            params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        } else if (startDate) {
            conditions.push(`l.transaction_date >= ?`);
            params.push(`${startDate} 00:00:00`);
        } else if (endDate) {
            conditions.push(`l.transaction_date <= ?`);
            params.push(`${endDate} 23:59:59`);
        }

        if (conditions.length > 0) {
            query += ` AND ` + conditions.join(' AND ');
        }

        query += ` ORDER BY l.transaction_date DESC`;

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        // Query to get all invoice items with current item cost price
        const business_id = req.user.business_id;
        const query = `
            SELECT 
                ii.final_amount as sale_amount, 
                ii.quantity, 
                i.purchase_price,
                inv.created_at as date
            FROM invoice_items ii
            JOIN invoices inv ON ii.invoice_id = inv.id
            JOIN items i ON ii.item_id = i.id
            WHERE inv.business_id = ?
        `;
        const [rows] = await db.execute(query, [business_id]);

        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);

        const stats = {
            total_sales: 0, total_profit: 0,
            weekly_sales: 0, weekly_profit: 0,
            monthly_sales: 0, monthly_profit: 0,
            yearly_sales: 0, yearly_profit: 0
        };

        rows.forEach(row => {
            const sale = parseFloat(row.sale_amount) || 0;
            const cost = (parseFloat(row.purchase_price) || 0) * (parseFloat(row.quantity) || 0);
            const profit = sale - cost;
            const date = new Date(row.date);

            // Total
            stats.total_sales += sale;
            stats.total_profit += profit;

            // Weekly
            if (date >= startOfWeek) {
                stats.weekly_sales += sale;
                stats.weekly_profit += profit;
            }
            // Monthly
            if (date >= startOfMonth) {
                stats.monthly_sales += sale;
                stats.monthly_profit += profit;
            }
            // Yearly
            if (date >= startOfYear) {
                stats.yearly_sales += sale;
                stats.yearly_profit += profit;
            }
        });

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};
