const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function fixMultipleBusinesses() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        try {
            console.log("Setting business_id as UNIQUE...");
            await db.query('ALTER TABLE shop_settings ADD UNIQUE (business_id)');
        } catch (e) { console.log("Unique key:", e.message); }

        try {
            console.log("Changing id to AUTO_INCREMENT...");
            await db.query('ALTER TABLE shop_settings MODIFY id INT AUTO_INCREMENT');
        } catch (e) { console.log("Auto increment:", e.message); }

        await db.end();
        console.log("Schema constraints updated for multitenancy!");
    } catch (e) {
        console.log("Fatal:", e.message);
    }
}
fixMultipleBusinesses();
