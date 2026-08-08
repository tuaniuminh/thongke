const fs = require('fs');
const path = require('path');

const OLD_VER = '4.3.136';
const NEW_VER = '4.3.137';

const filesToUpdate = [
    'version.json',
    'package.json',
    'manifest.json',
    'index.html',
    'sw.js',
    'src/core/app.js',
    'src/features/ket-noi-gia-dinh/ket-noi.js',
    'src/features/ho-so-y-te/ho-so-y-te.js',
    'src/features/quy-gia-dinh/quy-gia-dinh.js',
    'src/features/quy-gia-dinh/bao-cao-thang.js',
    'src/features/thu-chi-doi-ngoai/thu-chi.js',
    'src/features/we-love/we-love.js'
];

filesToUpdate.forEach(fileRelPath => {
    const fullPath = path.join(__dirname, '..', fileRelPath);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(OLD_VER)) {
            content = content.replaceAll(OLD_VER, NEW_VER);
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Updated: ${fileRelPath}`);
        } else {
            console.log(`No match in: ${fileRelPath}`);
        }
    } else {
        console.log(`File not found: ${fileRelPath}`);
    }
});
