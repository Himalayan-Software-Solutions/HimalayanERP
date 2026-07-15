const mysql = require('mysql2/promise');
require('dotenv').config();

async function addBlessings() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306
        });

        const alterStatements = [
            "ALTER TABLE shop_settings ADD COLUMN blessing_left VARCHAR(255) DEFAULT ''",
            "ALTER TABLE shop_settings ADD COLUMN blessing_center VARCHAR(255) DEFAULT ''",
            "ALTER TABLE shop_settings ADD COLUMN blessing_right VARCHAR(255) DEFAULT ''"
        ];

        for (const stmt of alterStatements) {
            try {
                await db.execute(stmt);
                console.log("SUCCESS:", stmt);
            } catch (e) {
                if (e.code !== 'ER_DUP_FIELDNAME') console.log("ERROR on", stmt, e.message);
                else console.log("COLUMN EXISTS for", stmt);
            }
        }
        await db.end();
    } catch (e) { console.error(e); }
}
addBlessings();
