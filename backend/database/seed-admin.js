const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
    try {
        const username = 'Jhabe Ram';
        const password = 'Welcome123';

        // Check if user exists
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
            console.log('Admin user already exists.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hashedPassword, 'admin']
        );

        console.log(`Admin user '${username}' created successfully.`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
}

seedAdmin();
