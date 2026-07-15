const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getAllBusinesses = async (req, res) => {
    try {
        const query = `
            SELECT b.*, 
                   (SELECT COUNT(*) FROM users u WHERE u.business_id = b.id) as user_count 
            FROM businesses b 
            ORDER BY b.created_at DESC
        `;
        const [businesses] = await db.execute(query);
        res.json(businesses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createBusiness = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { name, owner_name, email, phone, gstin, address, city, state, notes, password } = req.body;

        // 1. Check if email (username) already exists
        const [existingUsers] = await connection.execute('SELECT id FROM users WHERE username = ?', [email]);
        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Email (login ID) already exists' });
        }

        const [existingBusiness] = await connection.execute('SELECT id FROM businesses WHERE email = ?', [email]);
        if (existingBusiness.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Business email already registered' });
        }

        // 2. Insert Business
        const businessQuery = `
            INSERT INTO businesses (name, owner_name, email, phone, gstin, address, city, state, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        `;

        const [businessResult] = await connection.execute(businessQuery, [
            name, owner_name, email, phone, gstin, address, city, state, notes
        ]);
        const newBusinessId = businessResult.insertId;

        // 3. Insert Admin User for this Business
        const hashedPassword = await bcrypt.hash(password, 10);
        const userQuery = 'INSERT INTO users (username, password_hash, role, business_id) VALUES (?, ?, ?, ?)';
        await connection.execute(userQuery, [email, hashedPassword, 'admin', newBusinessId]);

        await connection.commit();
        res.status(201).json({ message: 'Business created successfully', businessId: newBusinessId });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};

exports.updateBusinessStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.execute('UPDATE businesses SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Business status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if business exists and isn't default
        if (parseInt(id) === 1) {
            return res.status(403).json({ error: 'Cannot delete the default legacy business.' });
        }
        await db.execute('DELETE FROM businesses WHERE id = ?', [id]);
        res.json({ message: 'Business deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.resetBusinessPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password for the admin of this business
        const [result] = await db.execute(
            'UPDATE users SET password_hash = ? WHERE business_id = ? AND role = "admin"',
            [hashedPassword, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Admin user for this business not found.' });
        }

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
