const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [rows] = await db.execute('SELECT id, business_id, invoice_number FROM invoices');
        console.log(rows);
        db.end();
    } catch (e) {
        console.error(e);
    }
}
run();
