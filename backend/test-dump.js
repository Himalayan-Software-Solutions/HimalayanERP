const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function testUsers() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            connectTimeout: 5000
        });

        try {
            const [tables] = await db.execute('SHOW TABLES;');
            fs.writeFileSync('tables_result.json', JSON.stringify(tables, null, 2));

            const [users] = await db.execute('SELECT username, role, business_id FROM users');
            fs.writeFileSync('users_result.json', JSON.stringify(users, null, 2));
        } catch (e) {
            fs.writeFileSync('err_result.txt', e.message);
        }

        await db.end();
    } catch (e) {
        fs.writeFileSync('err_result.txt', e.message);
    }
}
testUsers();
