const db = require('../src/config/db');

async function updateSchema() {
    try {
        const connection = await db.getConnection();
        console.log("Connected to database. Checking columns...");

        // 1. Check/Add columns to 'invoices'
        const [invColumns] = await connection.execute("SHOW COLUMNS FROM invoices");
        const invColNames = invColumns.map(c => c.Field);

        if (!invColNames.includes('total_igst')) {
            console.log("Adding total_igst to invoices...");
            await connection.execute("ALTER TABLE invoices ADD COLUMN total_igst DECIMAL(10,2) DEFAULT 0 AFTER total_cgst");
        }
        if (!invColNames.includes('is_interstate')) {
            console.log("Adding is_interstate to invoices...");
            await connection.execute("ALTER TABLE invoices ADD COLUMN is_interstate BOOLEAN DEFAULT FALSE AFTER payment_mode");
        }

        // 2. Check/Add columns to 'invoice_items'
        const [itemColumns] = await connection.execute("SHOW COLUMNS FROM invoice_items");
        const itemColNames = itemColumns.map(c => c.Field);

        if (!itemColNames.includes('igst_percent')) {
            console.log("Adding igst_percent to invoice_items...");
            await connection.execute("ALTER TABLE invoice_items ADD COLUMN igst_percent DECIMAL(5,2) DEFAULT 0 AFTER cgst_amount");
        }
        if (!itemColNames.includes('igst_amount')) {
            console.log("Adding igst_amount to invoice_items...");
            await connection.execute("ALTER TABLE invoice_items ADD COLUMN igst_amount DECIMAL(10,2) DEFAULT 0 AFTER igst_percent");
        }

        console.log("Schema update completed successfully.");
        connection.release();
        process.exit(0);

    } catch (error) {
        console.error("Schema update failed:", error);
        process.exit(1);
    }
}

updateSchema();
