const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

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

        // 3. Add business_id to all relevant tables
        const tablesToUpdate = [
            'users', 'customers', 'items', 'invoices', 'invoice_items', 'ledger', 'shop_settings'
        ];

        for (const table of tablesToUpdate) {
            try {
                // Add column if it doesn't exist
                await db.query(`ALTER TABLE ${table} ADD COLUMN business_id INT DEFAULT 1`);
                console.log(`✓ Added 'business_id' to '${table}' table (Default: 1).`);

                // Add foreign key
                await db.query(`
                    ALTER TABLE ${table} 
                    ADD CONSTRAINT fk_business_${table} 
                    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
                `);
                console.log(`✓ Added Foreign Key to '${table}'.`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`- 'business_id' already exists in '${table}'.`);
                } else if (err.code === 'ER_DUP_KEYNAME') {
                    console.log(`- Foreign Key already exists in '${table}'.`);
                } else {
                    console.error(`X Error altering '${table}':`, err.message);
                }
            }
        }

        // --- SUPER ADMIN SEEDING ---
        // 4. Update 'users' to allow longer usernames (emails) if needed. Currently VARCHAR(50).
        try {
            await db.query(`ALTER TABLE users MODIFY username VARCHAR(100) NOT NULL UNIQUE`);
            console.log("✓ Expanded users.username to VARCHAR(100) to safely hold emails.");
        } catch (e) {
            console.log("- users.username already expanded or error:", e.message);
        }

        // 5. Seed Super Admin
        const bcrypt = require('bcryptjs');
        const superAdminEmail = 'prince@himalayanerp.in';
        const superAdminPassword = await bcrypt.hash('prince12345', 10);

        const [existingAdmin] = await db.query('SELECT id FROM users WHERE username = ?', [superAdminEmail]);
        if (existingAdmin.length === 0) {
            // Note: Super Admin belongs to business_id 1 technically or NULL, but schema default is 1. 
            // The logic will bypass business_id checks for role='SUPERADMIN'.
            await db.query(
                `INSERT INTO users (username, password_hash, role, business_id) VALUES (?, ?, 'SUPERADMIN', 1)`,
                [superAdminEmail, superAdminPassword]
            );
            console.log(`✓ Super Admin seeded: ${superAdminEmail}`);
        } else {
            await db.query(
                `UPDATE users SET password_hash = ?, role = 'SUPERADMIN' WHERE username = ?`,
                [superAdminPassword, superAdminEmail]
            );
            console.log(`✓ Super Admin updated: ${superAdminEmail}`);
        }

        console.log("--------------------------------------------------");
        console.log("Multi-Tenancy Database Migration Completed Successfully!");

    } catch (error) {
        console.error("Migration Error:", error);
    } finally {
        await db.end();
    }
}
updateSchema().then(() => process.exit(0)).catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
