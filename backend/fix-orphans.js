const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixOrphans() {
    console.log("Script starting...");
    console.log("DB config:", {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log("Connected to DB!");

        const [invoices] = await db.query('SELECT id, invoice_number, business_id FROM invoices WHERE business_id IS NULL OR business_id = 0');
        console.log(`Found ${invoices.length} orphaned invoices`);

        if (invoices.length > 0) {
            const [updateInvoices] = await db.execute('UPDATE invoices SET business_id = 1 WHERE business_id IS NULL OR business_id = 0');
            console.log(`Updated ${updateInvoices.affectedRows} invoices.`);
        }

        const [ledger] = await db.query('SELECT id, invoice_id, business_id FROM ledger WHERE business_id IS NULL OR business_id = 0');
        console.log(`Found ${ledger.length} orphaned ledger entries`);

        if (ledger.length > 0) {
            const [updateLedger] = await db.execute('UPDATE ledger SET business_id = 1 WHERE business_id IS NULL OR business_id = 0');
            console.log(`Updated ${updateLedger.affectedRows} ledger entries.`);
        }

        await db.end();
        console.log("Database connection closed.");
    } catch (e) {
        console.error("Error:", e);
    }
}
fixOrphans();
