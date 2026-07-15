const db = require('../src/config/db');
require('dotenv').config({ path: '../.env' });

async function migrate() {
    try {
        console.log('Starting migration...');
        const connection = await db.getConnection();

        try {
            await connection.query(`
                ALTER TABLE invoices 
                ADD COLUMN freight_charges DECIMAL(10,2) DEFAULT 0.00 AFTER taxable_amount,
                ADD COLUMN labour_charges DECIMAL(10,2) DEFAULT 0.00 AFTER freight_charges
            `);
            console.log('Columns added successfully.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns already exist.');
            } else {
                throw err;
            }
        } finally {
            connection.release();
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
