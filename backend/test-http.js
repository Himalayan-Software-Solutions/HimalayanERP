const http = require('http');

const data = JSON.stringify({
    username: 'prince@himalayanerp.in',
    password: 'prince12345'
});

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        const token = JSON.parse(body).token;
        if (!token) return console.log("Login failed");

        const busData = JSON.stringify({
            email: 'testz2@example.com',
            password: 'randompass123',
            name: 'Test Business',
            owner_name: 'Test Owner',
            phone: '1234567890',
            gstin: '22AAAAA0000A1Z5',
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            notes: 'Test Notes'
        });

        const req2 = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/superadmin/businesses',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(busData),
                'Authorization': `Bearer ${token}`
            }
        }, (res2) => {
            let body2 = '';
            res2.on('data', chunk => body2 += chunk);
            res2.on('end', () => {
                console.log(`STATUS: ${res2.statusCode}`);
                console.log(`HEADERS: ${JSON.stringify(res2.headers)}`);
                console.log(`BODY: ${body2}`);
                const fs = require('fs');
                fs.writeFileSync('test-http-out.txt', `STATUS: ${res2.statusCode}\nBODY: ${body2}`);
            });
        });
        req2.on('error', e => console.error(e));
        req2.write(busData);
        req2.end();
    });
});
req.on('error', e => {
    console.error(e);
    const fs = require('fs');
    fs.writeFileSync('test-http-out.txt', `ERROR: ${e.message}`);
});
req.write(data);
req.end();
