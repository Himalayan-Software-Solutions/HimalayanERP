const mysql = require('mysql2/promise');
require('dotenv').config();

async function testUsers() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const [tables] = await db.execute('SHOW TABLES;');
        console.log("Tables:");
        tables.forEach(t => console.log(Object.values(t)[0]));

        try {
            const [users] = await db.execute('SELECT username, role, business_id FROM users');
            console.log("\nUsers in DB:");
            users.forEach(u => console.log(u));
        } catch (e) {
            console.error("Users error:", e.message);
        }

        await db.end();
    } catch (e) {
        console.error("FATAL:", e.message);
    }
}
testUsers();
