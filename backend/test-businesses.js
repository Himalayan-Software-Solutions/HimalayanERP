const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function checkDB() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const out = {};
        try {
            const [tables] = await db.query('SHOW TABLES');
            out.tables = tables.map(t => Object.values(t)[0]);

            const [businesses] = await db.query('SELECT * FROM businesses');
            out.businesses_table_count = businesses.length;
            if (businesses.length > 0) out.first_business = businesses[0];

            const [users] = await db.query('SELECT username, role, business_id FROM users');
            out.users = users;

        } catch (e) {
            out.error = e.message;
        }
        await db.end();
        fs.writeFileSync('biz_check.json', JSON.stringify(out, null, 2));
    } catch (e) {
        fs.writeFileSync('biz_check.json', JSON.stringify({ error: e.message }));
    }
}
checkDB();
