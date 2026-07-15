const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

app.get('/', async (req, res) => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
            connectTimeout: 5000
        });
        const [tables] = await connection.execute('SHOW TABLES;');
        await connection.end();
        res.json({ status: 'ok', tables });
    } catch (e) {
        res.status(500).json({ status: 'error', error: e.message });
    }
});

app.listen(5005, () => console.log('Test server running on 5005'));
