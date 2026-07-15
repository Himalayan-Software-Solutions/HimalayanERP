const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    });

    try {
        console.log("Starting Multi-Tenancy Database Migration...");

        // 1. Create businesses table
        await db.query(`
            CREATE TABLE IF NOT EXISTS businesses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                owner_name VARCHAR(100),
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20),
                gstin VARCHAR(20),
                address TEXT,
                city VARCHAR(50),
                state VARCHAR(50),
                notes TEXT,
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✓ 'businesses' table verified/created.");

        // 2. Insert a default business for existing data (if not exists)
        try {
            const [existingBusinesses] = await db.query('SELECT id FROM businesses WHERE id = 1');
            if (existingBusinesses.length === 0) {
                await db.query(`
                    INSERT INTO businesses (id, name, owner_name, email, status) 
                    VALUES (1, 'Default Business (Legacy)', 'Legacy Owner', 'default@himalayanerp.in', 'Active')
                `);
                console.log("✓ Default Business (ID: 1) created for legacy data.");
            } else {
                console.log("✓ Default Business already exists.");
            }
        } catch (e) {
            console.log("warn insertion:", e.message);
        }

        // 3. Add business_id to all relevant tables
        const tablesToUpdate = [
            'users', 'customers', 'items', 'invoices', 'invoice_items', 'ledger', 'shop_settings'
        ];

        for (const table of tablesToUpdate) {
            try {
                // Check if table exists first before altering
                const [tableExists] = await db.query(`SHOW TABLES LIKE '${table}'`);
                if (tableExists.length > 0) {
                    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN business_id INT DEFAULT 1`);
                    console.log(`✓ Added 'business_id' to '${table}' table (Default: 1).`);
                }
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`- 'business_id' already exists in '${table}'.`);
                } else {
                    console.log(`X Error altering '${table}':`, err.message);
                }
            }

            try {
                const [tableExists] = await db.query(`SHOW TABLES LIKE '${table}'`);
                if (tableExists.length > 0) {
                    await db.query(`
                        ALTER TABLE \`${table}\` 
                        ADD CONSTRAINT \`fk_business_${table}\` 
                        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
                    `);
                    console.log(`✓ Added Foreign Key to '${table}'.`);
                }
            } catch (err) {
                if (err.code === 'ER_DUP_KEYNAME') {
                    console.log(`- Foreign Key already exists in '${table}'.`);
                } else if (!err.message.includes('ER_DUP_KEYNAME')) {
                    console.log(`X FK Error for '${table}':`, err.message);
                }
            }
        }

        console.log("Migration Script Complete.");

    } catch (error) {
        console.error("Migration Error:", error);
    } finally {
        await db.end();
    }
}
updateSchema();
