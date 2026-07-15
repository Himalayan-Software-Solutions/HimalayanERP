const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function checkUsersRow() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        let out = {};
        try {
            const [rows] = await db.query('SELECT * FROM users');
            out.rows = rows;
        } catch (e) { out.error = e.message; }

        await db.end();
        fs.writeFileSync('users_row.json', JSON.stringify(out, null, 2));
    } catch (e) { }
}
checkUsersRow();
