const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, 'schema.sql');

async function initDB() {
    try {
        console.log('Connecting to MySQL server...');
        // Connect without database to allow creation
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('Connected. Reading schema...');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema migration...');
        // content of schema.sql handles CREATE DATABASE and USE
        await connection.query(schema);

        console.log('Database initialized successfully!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Fatal Error initializing database:', err);
        process.exit(1);
    }
}

initDB();
