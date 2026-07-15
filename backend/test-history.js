const db = require('./src/config/db');

async function checkHistory() {
    const [rows] = await db.query('SELECT * FROM due_payment_history ORDER BY id DESC LIMIT 5');
    console.log("HISTORY ROWS:", rows);
    process.exit(0);
}

checkHistory().catch(console.error);
