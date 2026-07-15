const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function initDuePayments() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    });

    try {
        console.log("Starting Due Payments Table Creation...");
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS due_customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT NOT NULL DEFAULT 1,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                gstin VARCHAR(20),
                due_amount DECIMAL(12, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
            )
        `);
        console.log("✓ 'due_customers' table created.");

        await db.query(`
            CREATE TABLE IF NOT EXISTS due_payment_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                due_customer_id INT NOT NULL,
                amount_paid DECIMAL(12, 2) NOT NULL,
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                payment_mode VARCHAR(20) DEFAULT 'Cash',
                notes TEXT,
                FOREIGN KEY (due_customer_id) REFERENCES due_customers(id) ON DELETE CASCADE
            )
        `);
        console.log("✓ 'due_payment_history' table created.");

    } catch (error) {
        console.error("Error creating tables:", error);
    } finally {
        await db.end();
    }
}

initDuePayments().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
