const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    console.log("Starting test-db-conn...");
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
        console.log("Connected!");
        const [tables] = await connection.execute('SHOW TABLES;');
        console.log("Tables:", tables);

        await connection.end();
    } catch (e) {
        console.error("DB Error:", e);
    }
}
test();
