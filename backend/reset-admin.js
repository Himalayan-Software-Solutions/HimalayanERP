const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

async function resetSuperAdmin() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const superAdminEmail = 'prince@himalayanerp.in';
        const superAdminPassword = await bcrypt.hash('prince12345', 10);
        let out = '';

        try {
            const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [superAdminEmail]);
            if (existing.length === 0) {
                await db.query(`INSERT INTO users (username, password_hash, role, business_id) VALUES (?, ?, 'SUPERADMIN', 1)`, [superAdminEmail, superAdminPassword]);
                out = "Superadmin recreated successfully with password prince12345";
            } else {
                await db.query(`UPDATE users SET password_hash = ?, role = 'SUPERADMIN' WHERE username = ?`, [superAdminPassword, superAdminEmail]);
                out = "Superadmin hash updated with password prince12345";
            }
        } catch (e) {
            out = "QERR: " + e.message;
        }

        await db.end();
        fs.writeFileSync('reset_out.txt', out);
    } catch (e) {
        fs.writeFileSync('reset_out.txt', "CERR: " + e.message);
    }
}
resetSuperAdmin();
