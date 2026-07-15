const fs = require('fs');
try {
    const b = fs.readFileSync('test_font.ttf');
    fs.writeFileSync('d:/NoVA/Himalayan ERP/Jhabe Ram & Sons/Code/frontend/src/utils/NotoSansDevanagari.js', 'export const NotoSansDevanagari = `' + b.toString('base64') + '`;');
    console.log("Written successfully");
} catch(e) {
    console.error(e);
}
