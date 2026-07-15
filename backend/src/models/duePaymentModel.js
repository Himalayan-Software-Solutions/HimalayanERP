const db = require('../config/db');

class DuePayment {
    // 1. Get all due customers for a business
    static async getAllDueCustomers(businessId) {
        const [rows] = await db.query(
            `SELECT * FROM due_customers 
             WHERE business_id = ? 
             ORDER BY created_at DESC`,
            [businessId]
        );
        return rows;
    }

    // 2. Add a new due customer
    static async addDueCustomer(customerData) {
        const { business_id, name, phone, address, gstin, due_amount } = customerData;
        const [result] = await db.query(
            `INSERT INTO due_customers (business_id, name, phone, address, gstin, due_amount)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [business_id, name, phone, address, gstin, due_amount || 0]
        );
        return result.insertId;
    }

    // 3. Update customer details or direct due amount update
    static async updateDueCustomer(id, businessId, updateData) {
        const { name, phone, address, gstin, due_amount } = updateData;
        const [result] = await db.query(
            `UPDATE due_customers 
             SET name=?, phone=?, address=?, gstin=?, due_amount=?
             WHERE id=? AND business_id=?`,
            [name, phone, address, gstin, due_amount, id, businessId]
        );
        return result.affectedRows > 0;
    }

    // 4. Delete a due customer
    static async deleteDueCustomer(id, businessId) {
        const [result] = await db.query(
            `DELETE FROM due_customers WHERE id=? AND business_id=?`,
            [id, businessId]
        );
        return result.affectedRows > 0;
    }

    // 5. Add a payment
    static async addPayment(dueCustomerId, businessId, amount, paymentMode = 'Cash', notes = '') {
        // First verify the customer belongs to the business
        const [customer] = await db.query(
            `SELECT due_amount FROM due_customers WHERE id=? AND business_id=?`,
            [dueCustomerId, businessId]
        );

        if (customer.length === 0) {
            throw new Error('Customer not found or unauthorized');
        }

        const currentDue = parseFloat(customer[0].due_amount);
        const paidAmount = parseFloat(amount);

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Insert into history
            await connection.query(
                `INSERT INTO due_payment_history (due_customer_id, amount_paid, payment_mode, notes)
                 VALUES (?, ?, ?, ?)`,
                [dueCustomerId, paidAmount, paymentMode, notes]
            );

            // Update main due amount
            await connection.query(
                `UPDATE due_customers SET due_amount = due_amount - ? WHERE id = ?`,
                [paidAmount, dueCustomerId]
            );

            await connection.commit();
            
            return {
                newDueAmount: currentDue - paidAmount
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // 6. Get payment history for a specific customer
    static async getPaymentHistory(dueCustomerId, businessId) {
        // Verify ownership
        const [customer] = await db.query(
            `SELECT id FROM due_customers WHERE id=? AND business_id=?`,
            [dueCustomerId, businessId]
        );
        if (customer.length === 0) return [];

        const [rows] = await db.query(
            `SELECT * FROM due_payment_history 
             WHERE due_customer_id = ? 
             ORDER BY payment_date DESC`,
            [dueCustomerId]
        );
        return rows;
    }
}

module.exports = DuePayment;
