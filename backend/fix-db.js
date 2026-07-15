const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');

async function run() {
    let log = "";
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME
        });

        log += "Connected to DB\n";

        // Step 1: Fix orphans directly
        const [updateRes] = await db.execute('UPDATE invoices SET business_id = 1 WHERE business_id IS NULL OR business_id = 0');
        log += `Fixed ${updateRes.affectedRows} legacy invoices to business 1\n`;

        const [updateLedger] = await db.execute('UPDATE ledger SET business_id = 1 WHERE business_id IS NULL OR business_id = 0');
        log += `Fixed ${updateLedger.affectedRows} legacy ledgers to business 1\n`;

        // Step 2: Fix Index (Optional: if we just fixed orphans, the generator will now see them!)
        // But doing the index fix is better for multi-tenancy.

        try {
            await db.execute('ALTER TABLE invoices DROP INDEX invoice_number');
            log += "Dropped unique global index on invoice_number\n";
        } catch (e) {
            log += "Index invoice_number already dropped or not found: " + e.message + "\n";
        }

        try {
            await db.execute('ALTER TABLE invoices ADD UNIQUE INDEX biz_invoice (business_id, invoice_number)');
            log += "Created composite unique index biz_invoice\n";
        } catch (e) {
            log += "Composite index already exists or error: " + e.message + "\n";
        }

        db.end();
    } catch (e) {
        log += "FATAL ERROR: " + e.message + "\n";
    }
    fs.writeFileSync('db-fix-log.txt', log);
}
run();
