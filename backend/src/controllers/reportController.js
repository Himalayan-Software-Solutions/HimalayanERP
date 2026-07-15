const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const business_id = req.user.business_id;

        // 1. Total Products
        const [itemRows] = await db.execute('SELECT COUNT(*) as count FROM items WHERE business_id = ?', [business_id]);
        const totalProducts = itemRows[0].count;

        // 2. Low Stock Items
        const [lowStockRows] = await db.execute('SELECT COUNT(*) as count FROM items WHERE current_stock <= min_stock_alert AND business_id = ?', [business_id]);
        const lowStockCount = lowStockRows[0].count;

        // 3. Sales Stats
        // Today
        const [todayRows] = await db.execute('SELECT SUM(final_amount) as total FROM invoices WHERE DATE(invoice_date) = ? AND business_id = ?', [today, business_id]);
        const todaySales = todayRows[0].total || 0;

        // This Month
        const [monthRows] = await db.execute('SELECT SUM(final_amount) as total FROM invoices WHERE MONTH(invoice_date) = MONTH(CURRENT_DATE()) AND YEAR(invoice_date) = YEAR(CURRENT_DATE()) AND business_id = ?', [business_id]);
        const monthSales = monthRows[0].total || 0;

        // This Year
        const [yearRows] = await db.execute('SELECT SUM(final_amount) as total FROM invoices WHERE YEAR(invoice_date) = YEAR(CURRENT_DATE()) AND business_id = ?', [business_id]);
        const yearSales = yearRows[0].total || 0;

        res.json({
            totalProducts,
            lowStockCount,
            sales: {
                today: todaySales,
                month: monthSales,
                year: yearSales
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSalesChartData = async (req, res) => {
    try {
        // Last 7 days sales
        const business_id = req.user.business_id;
        const query = `
            SELECT DATE(invoice_date) as date, SUM(final_amount) as total 
            FROM invoices 
            WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND business_id = ?
            GROUP BY DATE(invoice_date)
            ORDER BY DATE(invoice_date) ASC
        `;
        const [rows] = await db.execute(query, [business_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
