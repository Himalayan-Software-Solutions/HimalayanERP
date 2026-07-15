const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function checkInvoiceCols() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        let out = "";
        try {
            const [cols] = await db.query('SHOW COLUMNS FROM invoices');
            out = JSON.stringify(cols.map(c => c.Field), null, 2);
        } catch (e) { out = e.message; }

        await db.end();
        fs.writeFileSync('invoices_cols.json', out);
    } catch (e) { }
}
checkInvoiceCols();
