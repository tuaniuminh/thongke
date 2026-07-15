const fs = require('fs');
const path = require('path');

const srcDir = './src';
const destDir = './www';

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

// Clean and recreate destination
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

// Copy root files
const filesToCopy = ['index.html', 'manifest.json', 'sw.js', '404.html', 'version.json'];
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(destDir, file));
  }
});

// Copy src directory
if (fs.existsSync(srcDir)) {
  copyFolderRecursiveSync(srcDir, path.join(destDir, 'src'));
}

console.log('Successfully prepared web assets in www/ directory.');
