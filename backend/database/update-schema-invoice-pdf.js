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

        // Check if pdf_path column exists
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM invoices LIKE 'pdf_path'
        `);

        if (columns.length === 0) {
            // Add column if it doesn't exist
            await connection.execute(`
                ALTER TABLE invoices
                ADD COLUMN pdf_path VARCHAR(255) DEFAULT NULL AFTER transport_no
            `);
            console.log('Added pdf_path column to invoices table.');
        } else {
            console.log('pdf_path column already exists.');
        }

        await connection.end();
    } catch (error) {
        console.error('Error updating schema:', error);
    }
}

updateSchema();
