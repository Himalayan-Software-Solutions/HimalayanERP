const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Make sure this runs from backend/database
const fs = require('fs');
const path = require('path');

async function initPurchasesSchema() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true
    });

    try {
        console.log("Starting Purchases Schema Migration...");

        // 1. Create purchases table
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchases (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT NOT NULL,
                supplier_name VARCHAR(100) NOT NULL,
                supplier_phone VARCHAR(20),
                supplier_gstin VARCHAR(20),
                total_amount DECIMAL(12, 2) NOT NULL,
                purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
            )
        `);
        console.log("✓ 'purchases' table verified/created.");

        // 2. Create purchase_items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS purchase_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                purchase_id INT NOT NULL,
                item_id INT,
                item_name VARCHAR(200) NOT NULL,
                hsn_code VARCHAR(20),
                quantity DECIMAL(10, 2) NOT NULL,
                mrp DECIMAL(10, 2) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
            )
        `);
        console.log("✓ 'purchase_items' table verified/created.");

        console.log("--------------------------------------------------");
        console.log("Purchases Database Migration Completed Successfully!");

    } catch (error) {
        console.error("Migration Error:", error);
    } finally {
        await db.end();
    }
}

initPurchasesSchema().then(() => process.exit(0)).catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
