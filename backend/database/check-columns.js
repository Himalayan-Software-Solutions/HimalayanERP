const db = require('../src/config/db');

async function check() {
    try {
        const [b] = await db.query('SHOW COLUMNS FROM businesses');
        console.log('Businesses:', b);
        const [u] = await db.query('SHOW COLUMNS FROM users');
        console.log('Users:', u);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
