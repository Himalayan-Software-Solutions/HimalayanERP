const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSettingsTable() {
    try {
        console.log("Connecting...");
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log("Adding business_description column...");
        try {
            await db.execute('ALTER TABLE shop_settings ADD COLUMN business_description TEXT');
            console.log("Successfully added business_description.");
        } catch (e) {
            console.log("Already exists or error:", e.message);
        }

        // Also add signature_path just in case it's missing based on controller
        try {
            await db.execute('ALTER TABLE shop_settings ADD COLUMN signature_path VARCHAR(255) DEFAULT ""');
            console.log("Successfully added signature_path.");
        } catch (e) {
            console.log("Already exists or error:", e.message);
        }

        await db.end();
    } catch (e) {
        console.error("FATAL:", e.message);
    }
}
fixSettingsTable();
