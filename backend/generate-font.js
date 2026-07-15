const fs = require('fs');
const https = require('https');

const url = "https://fonts.gstatic.com/s/notosansdevanagari/v27/xJB-fylD11W9KAsyYl04M8Fm12K2nQYWeE8.ttf";
const destFile = 'd:/NoVA/Himalayan ERP/Jhabe Ram & Sons/Code/frontend/src/utils/NotoSansDevanagari.js';

console.log("Starting download...");

const req = https.get(url, { timeout: 10000 }, (res) => {
    if (res.statusCode !== 200) {
        console.error("HTTP GET ERROR: Status Code " + res.statusCode);
        process.exit(1);
    }
    
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const content = `export const NotoSansDevanagari = "${base64}";`;
        fs.writeFileSync(destFile, content);
        console.log("SUCCESS! File formally saved to " + destFile);
        process.exit(0);
    });
}).on('error', (e) => {
    console.error("HTTP GET ERROR: " + e.message);
    process.exit(1);
}).on('timeout', () => {
    console.error("HTTP TIMEOUT EXCEEDED!");
    req.abort();
    process.exit(1);
});
