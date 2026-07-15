const mysql = require('mysql2/promise');
require('dotenv').config();

async function forceUpdate() {
    try {
        console.log("Connecting...");
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });
        console.log("Connected!");

        try {
            await db.query(`ALTER TABLE users ADD COLUMN business_id INT DEFAULT 1`);
            console.log("Added business_id to users.");
        } catch (e) { console.log(e.message); }

        try {
            await db.query(`ALTER TABLE users MODIFY username VARCHAR(100) NOT NULL UNIQUE`);
            console.log("Expanded username column.");
        } catch (e) { console.log(e.message); }

        const bcrypt = require('bcryptjs');
        const superAdminEmail = 'prince@himalayanerp.in';
        const superAdminPassword = await bcrypt.hash('prince12345', 10);

        try {
            const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [superAdminEmail]);
            if (existing.length === 0) {
                await db.query(`INSERT INTO users (username, password_hash, role, business_id) VALUES (?, ?, 'SUPERADMIN', 1)`, [superAdminEmail, superAdminPassword]);
                console.log("Superadmin created.");
            } else {
                await db.query(`UPDATE users SET password_hash = ?, role = 'SUPERADMIN' WHERE username = ?`, [superAdminPassword, superAdminEmail]);
                console.log("Superadmin updated.");
            }
        } catch (e) { console.log(e.message); }

        await db.end();
    } catch (e) {
        console.error("FATAL:", e.message);
    }
}
forceUpdate();
