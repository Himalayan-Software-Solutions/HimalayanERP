const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdmin() {
    try {
        console.log("Connecting to:", process.env.DB_HOST, process.env.DB_PORT);
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            connectTimeout: 5000 // 5 seconds timeout before failing
        });
        const [users] = await connection.execute('SELECT username, role, business_id FROM users');
        console.log("Users in DB:", users);
        await connection.end();
    } catch (e) {
        console.error("DB Error:", e);
    }
}
checkAdmin();
