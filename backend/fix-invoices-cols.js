const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMissingInvoiceCols() {
    try {
        console.log("Connecting...");
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const alterStatements = [
            "ALTER TABLE invoices ADD COLUMN freight_charges DECIMAL(10,2) DEFAULT 0",
            "ALTER TABLE invoices ADD COLUMN labour_charges DECIMAL(10,2) DEFAULT 0",
            "ALTER TABLE invoices ADD COLUMN is_interstate BOOLEAN DEFAULT FALSE",
            "ALTER TABLE invoices ADD COLUMN driver_name VARCHAR(100) DEFAULT ''",
            "ALTER TABLE invoices ADD COLUMN transport_no VARCHAR(100) DEFAULT ''",
            "ALTER TABLE invoices ADD COLUMN gstin VARCHAR(20) DEFAULT ''",
            "ALTER TABLE invoices ADD COLUMN eway_bill_no VARCHAR(50) DEFAULT ''",
            "ALTER TABLE invoices ADD COLUMN pdf_path VARCHAR(255) DEFAULT ''",
            "ALTER TABLE invoices ADD COLUMN total_igst DECIMAL(10,2) DEFAULT 0"
        ];

        for (const stmt of alterStatements) {
            try {
                await db.execute(stmt);
                console.log("SUCCESS:", stmt);
            } catch (e) {
                // Ignore duplicate column errors
                if (e.code !== 'ER_DUP_FIELDNAME') {
                    console.log("ERROR on", stmt, e.message);
                } else {
                    console.log("EXISTS:", stmt.split(' ADD COLUMN ')[1].split(' ')[0]);
                }
            }
        }

        // Also check invoice_items table for IGST columns
        const itemAlterStatements = [
            "ALTER TABLE invoice_items ADD COLUMN igst_percent DECIMAL(5,2) DEFAULT 0",
            "ALTER TABLE invoice_items ADD COLUMN igst_amount DECIMAL(10,2) DEFAULT 0"
        ];
        for (const stmt of itemAlterStatements) {
            try {
                await db.execute(stmt);
                console.log("SUCCESS:", stmt);
            } catch (e) {
                if (e.code !== 'ER_DUP_FIELDNAME') console.log("ERROR on", stmt, e.message);
            }
        }

        await db.end();
        console.log("Finished applying invoice schema updates.");
    } catch (e) {
        console.error("FATAL:", e.message);
    }
}
addMissingInvoiceCols();
