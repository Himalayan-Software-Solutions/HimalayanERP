const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Middleware
app.use(helmet());
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
// app.use('/uploads/signatures', express.static(path.join(__dirname, '../uploads/signatures')));
app.use('/uploads/invoices', express.static(path.join(__dirname, '../uploads/invoices'))); // Moved to server.js


// Routes
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const masterRoutes = require('./routes/masterRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const duePaymentRoutes = require('./routes/duePaymentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/purchases', purchaseRoutes);
app.use('/api/due-payments', duePaymentRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Himalayan ERP Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
