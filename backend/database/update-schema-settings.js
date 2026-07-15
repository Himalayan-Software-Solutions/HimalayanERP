const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function updateSchema() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        console.log('Creating shop_settings table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS shop_settings (
                id INT PRIMARY KEY DEFAULT 1,
                business_name VARCHAR(255) DEFAULT 'HIMALAYAN ENTERPRISES',
                owner_name VARCHAR(255) DEFAULT '',
                logo_path VARCHAR(255) DEFAULT '',
                gstin VARCHAR(50) DEFAULT '',
                contacts VARCHAR(255) DEFAULT '',
                email VARCHAR(255) DEFAULT '',
                address TEXT,
                signatory_name VARCHAR(255) DEFAULT 'Authorised Signatory',
                bank_name VARCHAR(255) DEFAULT '',
                bank_branch VARCHAR(255) DEFAULT '',
                account_holder_name VARCHAR(255) DEFAULT '',
                account_number VARCHAR(50) DEFAULT '',
                ifsc_code VARCHAR(50) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Check if default row exists
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM shop_settings WHERE id = 1');
        if (rows[0].count === 0) {
            console.log('Inserting default settings...');
            await connection.execute(`
                INSERT INTO shop_settings (id, business_name, address, gstin, contacts, bank_name, account_number, ifsc_code)
                VALUES (1, 'HIMALAYAN ENTERPRISES', 'H.O.: Main Market, Near Bus Stand, Kullu, HP - 175101', 'XXXXXXXXXXXXXXX', '98160-XXXXX', 'HDFC Bank', 'XXXXXXXXXXXXXX', 'XXXX0000')
            `);
        }

        console.log('Schema update for settings completed successfully.');

    } catch (error) {
        console.error('Schema update failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
