const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Login Status:', res.statusCode);
    console.log('Login Body:', data);
    
    if (res.statusCode === 200) {
      const token = JSON.parse(data).token;
      
      const payload = JSON.stringify({
        name: 'Test Customer',
        phone: '1234567890',
        address: '123 Main St',
        gstin: '',
        due_amount: '1000'
      });
      
      const options2 = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/due-payments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': payload.length
        }
      };
      
      const req2 = http.request(options2, (res2) => {
        let data2 = '';
        res2.on('data', chunk => { data2 += chunk; });
        res2.on('end', () => {
          console.log('Add Customer Status:', res2.statusCode);
          console.log('Add Customer Body:', data2);
        });
      });
      
      req2.on('error', (e) => {
        console.error('Request 2 Error:', e.message);
      });
      
      req2.write(payload);
      req2.end();
    }
  });
});

req.on('error', (e) => {
  console.error('Request 1 Error:', e.message);
});

req.write(JSON.stringify({ username: 'prince@himalayanerp.in', password: 'prince12345' }));
req.end();
