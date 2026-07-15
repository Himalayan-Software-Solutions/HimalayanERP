-- Database Schema for Himalayan ERP

-- Database schema mapped below
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    gstin VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items (Inventory) Table
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    hsn_code VARCHAR(20),
    unit VARCHAR(20), -- bag, piece, kg, etc.
    mrp DECIMAL(10, 2) NOT NULL,
    purchase_price DECIMAL(10, 2),
    selling_price DECIMAL(10, 2) NOT NULL,
    opening_stock DECIMAL(10, 2) DEFAULT 0,
    current_stock DECIMAL(10, 2) DEFAULT 0,
    gst_percent DECIMAL(5, 2) DEFAULT 0,
    min_stock_alert DECIMAL(10, 2) DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_id INT,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    payment_mode VARCHAR(20), -- Cash, UPI, Card, Credit
    gross_amount DECIMAL(12, 2) DEFAULT 0,
    total_discount DECIMAL(12, 2) DEFAULT 0,
    taxable_amount DECIMAL(12, 2) DEFAULT 0,
    total_sgst DECIMAL(12, 2) DEFAULT 0,
    total_cgst DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    item_id INT,
    item_name VARCHAR(200) NOT NULL,
    hsn_code VARCHAR(20),
    quantity DECIMAL(10, 2) NOT NULL,
    rate DECIMAL(10, 2) NOT NULL, -- Usually MRP
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    taxable_value DECIMAL(10, 2) NOT NULL,
    sgst_percent DECIMAL(5, 2) DEFAULT 0,
    sgst_amount DECIMAL(10, 2) DEFAULT 0,
    cgst_percent DECIMAL(5, 2) DEFAULT 0,
    cgst_amount DECIMAL(10, 2) DEFAULT 0,
    final_amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Ledger / Accounts Table
CREATE TABLE IF NOT EXISTS ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255),
    invoice_id INT,
    customer_id INT,
    debit DECIMAL(12, 2) DEFAULT 0,  -- Money OUT / Receivable increase
    credit DECIMAL(12, 2) DEFAULT 0, -- Money IN / Receivable decrease
    balance DECIMAL(12, 2) DEFAULT 0, -- Running balance (optional, or calculated)
    payment_mode VARCHAR(20),
    is_system_entry BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
