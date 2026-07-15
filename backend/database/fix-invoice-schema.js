const db = require('../src/config/db');

async function fixSchema() {
    try {
        console.log('Applying Schema Fixes for Invoices table...');

        const columns = [
            'ADD COLUMN gstin VARCHAR(50) AFTER customer_address',
            'ADD COLUMN eway_bill_no VARCHAR(50) AFTER gstin',
            'ADD COLUMN freight_charges DECIMAL(12, 2) DEFAULT 0 AFTER final_amount',
            'ADD COLUMN labour_charges DECIMAL(12, 2) DEFAULT 0 AFTER freight_charges'
        ];

        for (const col of columns) {
            try {
                await db.execute(`ALTER TABLE invoices ${col}`);
                console.log(`Successfully added: ${col.split(' ')[2]}`);
            } catch (err) {
                // Ignore if duplicate column or other specific errors if needed
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column already exists: ${col.split(' ')[2]}`);
                } else {
                    console.error(`Failed to add column: ${col}`, err.message);
                }
            }
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

fixSchema();
