const db = require('../src/config/db');

async function updateSchema() {
    try {
        console.log('Updating schema for Masters...');

        // Categories Table
        await db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);

        // Units Table
        await db.execute(`
      CREATE TABLE IF NOT EXISTS units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
      )
    `);

        // Seed Defaults
        const defaultCategories = ['Cement', 'Plumbing', 'Electrical', 'Hardware', 'Paints', 'Sanitary', 'Tools'];
        const defaultUnits = ['Piece', 'Bag', 'Kg', 'Liter', 'Meter', 'Sq.ft', 'Box'];

        for (const cat of defaultCategories) {
            await db.execute('INSERT IGNORE INTO categories (name) VALUES (?)', [cat]);
        }
        for (const unit of defaultUnits) {
            await db.execute('INSERT IGNORE INTO units (name) VALUES (?)', [unit]);
        }

        console.log('Masters schema updated and seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

updateSchema();
