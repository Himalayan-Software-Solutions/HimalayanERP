const db = require('./src/config/db');
async function test() {
    try {
        const phone = '7505710583';
        const businessId = 2; // Railway DB has user under business_id = 2 based on previous logs!

        const [dueRows] = await db.query(
            'SELECT name as customer_name, phone as customer_phone, address as customer_address, gstin FROM due_customers WHERE phone = ? AND business_id = ? LIMIT 1',
            [phone, businessId]
        );

        const [invoiceRows] = await db.query(
            'SELECT customer_name, customer_phone, customer_address, gstin FROM invoices WHERE customer_phone = ? AND business_id = ? ORDER BY created_at DESC LIMIT 1',
            [phone, businessId]
        );

        require('fs').writeFileSync('debug-result.json', JSON.stringify({ dueRows, invoiceRows }));
    } catch(e) {
        require('fs').writeFileSync('debug-result.json', JSON.stringify({ error: e.message }));
    }
    process.exit(0);
}
test();
