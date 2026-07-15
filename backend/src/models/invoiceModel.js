const db = require('../config/db');

class Invoice {
    static async create(invoiceData, invoiceItems, business_id) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const {
                customer_id = null, customer_name, customer_phone, customer_address,
                gstin = '', payment_mode, gross_amount, total_discount, taxable_amount,
                total_sgst, total_cgst, total_igst = 0, final_amount, invoice_number,
                freight_charges = 0, labour_charges = 0, is_interstate = false,
                driver_name = '', transport_no = '',
                paying_now = null
            } = invoiceData;

            // 1. Insert Invoice
            const invoiceQuery = `
        INSERT INTO invoices (
          business_id, invoice_number, customer_id, customer_name, customer_phone, customer_address,
          payment_mode, gross_amount, total_discount, taxable_amount,
          total_sgst, total_cgst, total_igst, final_amount, freight_charges, labour_charges, is_interstate,
          driver_name, transport_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

            const [invoiceResult] = await connection.execute(invoiceQuery, [
                business_id, invoice_number, customer_id || null, customer_name, customer_phone, customer_address,
                payment_mode, gross_amount, total_discount, taxable_amount,
                total_sgst, total_cgst, total_igst, final_amount, freight_charges, labour_charges, is_interstate,
                driver_name, transport_no
            ]);

            const invoiceId = invoiceResult.insertId;

            // 2. Process Items (Check stock, Deduct stock, Insert Item)
            const itemQuery = `
        INSERT INTO invoice_items (
          invoice_id, item_id, item_name, hsn_code, quantity, rate,
          discount_percent, discount_amount, taxable_value,
          sgst_percent, sgst_amount, cgst_percent, cgst_amount, igst_percent, igst_amount, final_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

            const updateStockQuery = `UPDATE items SET current_stock = current_stock - ? WHERE id = ?`;
            const checkStockQuery = `SELECT current_stock, min_stock_alert FROM items WHERE id = ?`;

            for (const item of invoiceItems) {
                // Stock Validation
                if (item.item_id) { // Only check if item exists in inventory
                    const [stockRows] = await connection.execute(checkStockQuery, [item.item_id]);
                    if (stockRows.length === 0) {
                        throw new Error(`Item ID ${item.item_id} not found`);
                    }
                    const currentStock = stockRows[0].current_stock;
                    if (currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for item: ${item.item_name}. Available: ${currentStock}`);
                    }

                    // Deduct Stock
                    await connection.execute(updateStockQuery, [item.quantity, item.item_id]);
                }

                // Insert Invoice Item
                await connection.execute(itemQuery, [
                    invoiceId, item.item_id, item.item_name, item.hsn_code, item.quantity, item.rate,
                    item.discount_percent, item.discount_amount, item.taxable_value,
                    item.sgst_percent, item.sgst_amount, item.cgst_percent, item.cgst_amount,
                    item.igst_percent || 0, item.igst_amount || 0, item.final_amount
                ]);
            }

            // 3. Update Ledger
            // If payment mode is NOT Credit, we assume full payment immediately?
            // Or we just record the Sale entry.
            // Usually: Debit Customer (Receivable), Credit Sales.
            // If Cash: Debit Cash, Credit Customer.
            // For simplicity, we record the transaction.

            const ledgerDescription = `Invoice #${invoice_number}`;
            const ledgerQuery = `
        INSERT INTO ledger (business_id, invoice_id, customer_id, description, debit, credit, balance, payment_mode)
        VALUES (?, ?, ?, ?, ?, 0, 0, ?)
      `;
            // Debit the customer (they owe money or paid money - wait. If simple POS, we record sale)
            // If Cash Sale: Entry 1: Sale (Credit), Entry 2: Cash Recieved (Debit).
            // Let's just log the 'Debit' amount as the invoice value against the customer for now.

            await connection.execute(ledgerQuery, [
                business_id, invoiceId, customer_id, ledgerDescription, final_amount, payment_mode
            ]);

            // 4. Update Due Payments if there's an underpayment/overpayment
            if (paying_now !== null && paying_now !== undefined) {
                const payingNowParsed = parseFloat(paying_now) || 0;
                const finalAmountParsed = parseFloat(final_amount) || 0;
                const difference = finalAmountParsed - payingNowParsed; 
                
                if (difference !== 0) {
                    let dueCheck = [];
                    // Fallback to name-based lookup if phone is missing
                    if (customer_phone) {
                        [dueCheck] = await connection.execute(
                            'SELECT id, due_amount FROM due_customers WHERE phone = ? AND business_id = ? LIMIT 1',
                            [customer_phone, business_id]
                        );
                    } else if (customer_name) {
                        [dueCheck] = await connection.execute(
                            'SELECT id, due_amount FROM due_customers WHERE name = ? AND business_id = ? LIMIT 1',
                            [customer_name, business_id]
                        );
                    }

                    if (dueCheck.length > 0) {
                        const dueId = dueCheck[0].id;
                        await connection.execute(
                            'UPDATE due_customers SET due_amount = due_amount + ? WHERE id = ?',
                            [difference, dueId]
                        );
                        
                        // Log history for existing due customer
                        await connection.execute(
                            `INSERT INTO due_payment_history (due_customer_id, amount_paid, payment_mode, notes) VALUES (?, ?, 'Invoice', ?)`,
                            [dueId, -difference, `Bill / Sale #${invoice_number}`]
                        );
                    } else if (difference !== 0) {
                        // Insert new due customer
                        const [insertRes] = await connection.execute(
                            'INSERT INTO due_customers (business_id, name, phone, address, gstin, due_amount) VALUES (?, ?, ?, ?, ?, ?)',
                            [business_id, customer_name, customer_phone || null, customer_address || '', gstin || '', difference]
                        );

                        // Log history for new due customer
                        await connection.execute(
                            `INSERT INTO due_payment_history (due_customer_id, amount_paid, payment_mode, notes) VALUES (?, ?, 'Invoice', ?)`,
                            [insertRes.insertId, -difference, `Initial Bill #${invoice_number}`]
                        );
                    }
                }
            }

            await connection.commit();
            return invoiceId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async generateInvoiceNumber(business_id = 1) {
        // Find the maximum invoice number suffix for the current year
        const currentYear = new Date().getFullYear();
        const prefix = `INV-${currentYear}-`;

        const [rows] = await db.execute(
            'SELECT invoice_number FROM invoices WHERE business_id = ? AND invoice_number LIKE ? ORDER BY id DESC LIMIT 1',
            [business_id, `${prefix}%`]
        );

        let nextId = 1;
        if (rows.length > 0) {
            const lastInvoiceNumber = rows[0].invoice_number;
            const parts = lastInvoiceNumber.split('-');
            if (parts.length === 3) {
                nextId = parseInt(parts[2], 10) + 1;
            }
        }

        return `${prefix}${String(nextId).padStart(4, '0')}`;
    }

    static async update(id, invoiceData, business_id) {
        const connection = await db.getConnection();
        const { items } = invoiceData; // Extract items from data

        try {
            await connection.beginTransaction();

            // 1. Fetch Existing Items to Restore Stock
            const [existingItems] = await connection.execute(
                'SELECT item_id, quantity FROM invoice_items WHERE invoice_id = ?',
                [id]
            );

            // 2. Restore Stock for Old Items
            const restoreStockQuery = `UPDATE items SET current_stock = current_stock + ? WHERE id = ?`;
            for (const item of existingItems) {
                if (item.item_id) {
                    await connection.execute(restoreStockQuery, [item.quantity, item.item_id]);
                }
            }

            // 3. Delete Old Invoice Items
            await connection.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

            // 4. Update Invoice Header
            const updateInvoiceQuery = `
                UPDATE invoices SET 
                    invoice_number = ?, customer_name = ?, customer_phone = ?, customer_address = ?,
                    gstin = ?, eway_bill_no = ?, payment_mode = ?, created_at = ?,
                    gross_amount = ?, total_discount = ?, taxable_amount = ?,
                    total_sgst = ?, total_cgst = ?, total_igst = ?, final_amount = ?,
                    freight_charges = ?, labour_charges = ?, is_interstate = ?,
                    driver_name = ?, transport_no = ?
                WHERE id = ? AND business_id = ?
            `;

            await connection.execute(updateInvoiceQuery, [
                invoiceData.invoice_number, invoiceData.customer_name, invoiceData.customer_phone, invoiceData.customer_address,
                invoiceData.gstin, invoiceData.eway_bill_no, invoiceData.payment_mode, invoiceData.date,
                invoiceData.gross_amount, invoiceData.total_discount, invoiceData.taxable_amount,
                invoiceData.total_sgst, invoiceData.total_cgst, invoiceData.total_igst || 0, invoiceData.final_amount,
                invoiceData.freight_charges || 0, invoiceData.labour_charges || 0, invoiceData.is_interstate,
                invoiceData.driver_name || '', invoiceData.transport_no || '',
                id, business_id
            ]);

            // 5. Insert New Items & Deduct Stock
            const itemQuery = `
                INSERT INTO invoice_items (
                    invoice_id, item_id, item_name, hsn_code, quantity, rate,
                    discount_percent, discount_amount, taxable_value,
                    sgst_percent, sgst_amount, cgst_percent, cgst_amount, igst_percent, igst_amount, final_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const deductStockQuery = `UPDATE items SET current_stock = current_stock - ? WHERE id = ?`;

            for (const item of items) {
                // Determine item_id (might be null if it's a manual ad-hoc item, but usually we link it)
                // For simplicity, we assume if item_id is present, we manage stock.

                if (item.item_id) {
                    // Deduct Stock
                    await connection.execute(deductStockQuery, [item.quantity, item.item_id]);
                }

                await connection.execute(itemQuery, [
                    id, item.item_id || null, item.item_name, item.hsn_code, item.quantity, item.rate,
                    item.discount_percent, item.discount_amount, item.taxable_value,
                    item.sgst_percent, item.sgst_amount, item.cgst_percent, item.cgst_amount,
                    item.igst_percent || 0, item.igst_amount || 0, item.final_amount
                ]);
            }

            // 6. Update Ledger
            // We assume simple 1-to-1 ledger entry for the invoice.
            const updateLedgerQuery = `
                UPDATE ledger SET 
                    customer_id = ?, description = ?, debit = ?, credit = 0, payment_mode = ?, transaction_date = ?
                WHERE invoice_id = ? AND business_id = ?
            `;
            // Note: Customer ID might change if name changes and we linked it dynamically, but here we just take what's passed or null
            await connection.execute(updateLedgerQuery, [
                invoiceData.customer_id || null,
                `Invoice #${invoiceData.invoice_number}`,
                invoiceData.final_amount,
                invoiceData.payment_mode,
                invoiceData.date,
                id, business_id
            ]);

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id, business_id) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Get Items to restore stock
            const [items] = await connection.execute('SELECT item_id, quantity FROM invoice_items WHERE invoice_id = ?', [id]);

            // 2. Restore Stock
            const updateStockQuery = `UPDATE items SET current_stock = current_stock + ? WHERE id = ?`;
            for (const item of items) {
                if (item.item_id) {
                    await connection.execute(updateStockQuery, [item.quantity, item.item_id]);
                }
            }

            // 3. Delete Ledger Entry
            await connection.execute('DELETE FROM ledger WHERE invoice_id = ? AND business_id = ?', [id, business_id]);

            // 4. Delete Invoice Items (Cascade usually handles this, but let's be safe)
            await connection.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

            // 5. Delete Invoice
            await connection.execute('DELETE FROM invoices WHERE id = ? AND business_id = ?', [id, business_id]);

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async findById(id, business_id) {
        const [rows] = await db.execute('SELECT * FROM invoices WHERE id = ? AND business_id = ?', [id, business_id]);
        if (rows.length === 0) return null;

        const invoice = rows[0];
        const [items] = await db.execute('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);

        return { invoice, items };
    }

    static async updatePdfPath(id, pdfPath, business_id) {
        const [result] = await db.execute(
            'UPDATE invoices SET pdf_path = ? WHERE id = ? AND business_id = ?',
            [pdfPath, id, business_id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Invoice;
