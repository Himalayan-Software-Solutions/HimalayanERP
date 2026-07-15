require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function test() {
    let log = "Starting test...\n";
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        log += "Connected to DB\n";

        const businessQuery = `
            INSERT INTO businesses (name, owner_name, email, phone, gstin, address, city, state, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        `;
        const [businessResult] = await db.execute(businessQuery, [
            "Test Empty", "", "test_empty@test.com", "", "", "", "", "", ""
        ]);
        log += "Business inserted: " + businessResult.insertId + "\n";

    } catch (err) {
        log += "ERROR: " + err.message + "\n" + err.stack;
    } finally {
        fs.writeFileSync('test-out.txt', log);
        process.exit();
    }
}
test();
