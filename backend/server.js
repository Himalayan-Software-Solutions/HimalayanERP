const app = require('./src/app');
const db = require('./src/config/db');
const express = require('express');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Serve static files from the root uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
