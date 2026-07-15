const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function updateSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check if terms_and_conditions column exists
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM settings LIKE 'terms_and_conditions'
        `);

        if (columns.length === 0) {
            // Add column if it doesn't exist
            await connection.execute(`
                ALTER TABLE settings
                ADD COLUMN terms_and_conditions TEXT AFTER business_description
            `);
            console.log('Added terms_and_conditions column to settings table.');
        } else {
            console.log('terms_and_conditions column already exists.');
        }

        await connection.end();
    } catch (error) {
        console.error('Error updating schema:', error);
    }
}

updateSchema();
