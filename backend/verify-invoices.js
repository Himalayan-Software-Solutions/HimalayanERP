const db = require('./src/config/db');

async function run() {
    try {
        const [rows] = await db.execute('SELECT id, business_id, invoice_number FROM invoices');
        console.log("INVOICES DATA:", rows);
        process.exit(0);
    } catch (e) {
        console.error("DB ERROR:", e);
        process.exit(1);
    }
}
run();
