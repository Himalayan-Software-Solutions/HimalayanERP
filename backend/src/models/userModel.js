const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { username, password, role = 'admin', business_id = 1 } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO users (username, password_hash, role, business_id) VALUES (?, ?, ?, ?)';
        const [result] = await db.execute(query, [username, hashedPassword, role, business_id]);
        return result.insertId;
    }

    static async findByUsername(username) {
        const query = `
            SELECT u.*, COALESCE(s.business_name, b.name) as business_name
            FROM users u
            LEFT JOIN businesses b ON u.business_id = b.id
            LEFT JOIN shop_settings s ON u.business_id = s.business_id
            WHERE u.username = ?
        `;
        const [rows] = await db.execute(query, [username]);
        return rows[0];
    }

    static async findById(id) {
        const query = `
            SELECT u.id, u.username, u.role, u.business_id, COALESCE(s.business_name, b.name) as business_name, u.created_at
            FROM users u
            LEFT JOIN businesses b ON u.business_id = b.id
            LEFT JOIN shop_settings s ON u.business_id = s.business_id
            WHERE u.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }
}

module.exports = User;
