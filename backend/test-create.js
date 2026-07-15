require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

async function test() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log("Connected to DB");
        const [b] = await db.query('SHOW COLUMNS FROM businesses');
        console.log('Businesses schema loaded');

        // try inserting
        const businessQuery = `
            INSERT INTO businesses (name, owner_name, email, phone, gstin, address, city, state, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        `;
        const [businessResult] = await db.execute(businessQuery, [
            "Test", "Owner", "test@test.com", "123", "123", "123", "123", "123", "notes"
        ]);
        console.log("Business inserted:", businessResult.insertId);

        const userQuery = 'INSERT INTO users (username, password_hash, role, business_id) VALUES (?, ?, ?, ?)';
        await db.execute(userQuery, ["test@test.com", "hashed", "admin", businessResult.insertId]);
        console.log("User inserted");

    } catch (err) {
        console.error("\n--- SQL ERROR DETECTED ---");
        console.error(err.message, "\n--------------------------");
    } finally {
        process.exit();
    }
}
test();
