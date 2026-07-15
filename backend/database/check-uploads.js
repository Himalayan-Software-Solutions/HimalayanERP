const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');
const invoicesDir = path.join(uploadsDir, 'invoices');
const signaturesDir = path.join(uploadsDir, 'signatures');

console.log(`Checking directories...`);
console.log(`Root: ${__dirname}`);
console.log(`Uploads: ${uploadsDir}`);

if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating ${uploadsDir}`);
    fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(invoicesDir)) {
    console.log(`Creating ${invoicesDir}`);
    fs.mkdirSync(invoicesDir);
} else {
    console.log(`${invoicesDir} exists.`);
}

if (!fs.existsSync(signaturesDir)) {
    console.log(`Creating ${signaturesDir}`);
    fs.mkdirSync(signaturesDir);
} else {
    console.log(`${signaturesDir} exists.`);
}
