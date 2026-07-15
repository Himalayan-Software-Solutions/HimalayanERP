const db = require('../config/db');

exports.getSettings = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        const [rows] = await db.execute('SELECT * FROM shop_settings WHERE business_id = ?', [businessId]);
        if (rows.length === 0) {
            // Return empty settings if not found
            return res.json({
                business_name: '', owner_name: '', gstin: '', contacts: '', email: '',
                address: '', signatory_name: '', bank_name: '', bank_branch: '',
                account_holder_name: '', account_number: '', ifsc_code: '',
                business_description: '', terms_and_conditions: '', signature_path: '',
                blessing_left: '', blessing_center: '', blessing_right: ''
            });
        }
        const settings = rows[0];
        // Convert any null fields to empty strings to keep React controlled inputs happy
        Object.keys(settings).forEach(key => {
            if (settings[key] === null) {
                settings[key] = '';
            }
        });

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        const {
            business_name, owner_name, gstin, contacts, email, address,
            signatory_name, bank_name, bank_branch, account_holder_name,
            account_number, ifsc_code, business_description, terms_and_conditions,
            blessing_left, blessing_center, blessing_right
        } = req.body;

        const query = `
            INSERT INTO shop_settings (
                business_id, business_name, owner_name, gstin, contacts, email, address,
                signatory_name, bank_name, bank_branch, account_holder_name,
                account_number, ifsc_code, business_description, terms_and_conditions,
                blessing_left, blessing_center, blessing_right
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                business_name = VALUES(business_name),
                owner_name = VALUES(owner_name),
                gstin = VALUES(gstin),
                contacts = VALUES(contacts),
                email = VALUES(email),
                address = VALUES(address),
                signatory_name = VALUES(signatory_name),
                bank_name = VALUES(bank_name),
                bank_branch = VALUES(bank_branch),
                account_holder_name = VALUES(account_holder_name),
                account_number = VALUES(account_number),
                ifsc_code = VALUES(ifsc_code),
                business_description = VALUES(business_description),
                business_description = VALUES(business_description),
                terms_and_conditions = VALUES(terms_and_conditions),
                blessing_left = VALUES(blessing_left),
                blessing_center = VALUES(blessing_center),
                blessing_right = VALUES(blessing_right)
        `;

        const params = [
            businessId, business_name, owner_name, gstin, contacts, email, address,
            signatory_name, bank_name, bank_branch, account_holder_name,
            account_number, ifsc_code, business_description, terms_and_conditions,
            blessing_left, blessing_center, blessing_right
        ].map(val => val === undefined ? null : val);

        await db.execute(query, params);

        // Also sync the `businesses` table's name if it was updated
        await db.execute('UPDATE businesses SET name = ? WHERE id = ?', [business_name, businessId]);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.uploadSignature = async (req, res) => {
    try {
        const businessId = req.user.business_id;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const signaturePath = '/uploads/signatures/' + req.file.filename;

        // Upsert signature path just in case row doesn't exist
        await db.execute(`
            INSERT INTO shop_settings (business_id, signature_path) 
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE signature_path = VALUES(signature_path)
        `, [businessId, signaturePath]);

        res.json({ message: 'Signature uploaded successfully', signature_path: signaturePath });
    } catch (error) {
        console.error('Error uploading signature:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
