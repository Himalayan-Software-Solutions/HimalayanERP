const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixSettingsTable2() {
    try {
        console.log("Connecting...");
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        console.log("Adding terms_and_conditions column...");
        try {
            await db.execute('ALTER TABLE shop_settings ADD COLUMN terms_and_conditions TEXT');
            console.log("Successfully added terms_and_conditions.");
        } catch (e) {
            console.log("Already exists or error:", e.message);
        }

        await db.end();
    } catch (e) {
        console.error("FATAL:", e.message);
    }
}
fixSettingsTable2();
