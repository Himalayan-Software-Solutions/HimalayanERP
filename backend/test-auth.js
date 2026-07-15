const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'prince@himalayanerp.in',
            password: 'prince12345'
        });
        const token = res.data.token;
        const res2 = await axios.get('http://localhost:5000/api/settings', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Settings Response:");
        console.log(res2.data);
    } catch (e) { console.error(e.message, e.response?.data); }
}
test();
