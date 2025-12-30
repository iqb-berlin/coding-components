#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const execSync = require('child_process').execSync;

const packageName = process.argv[2];
const packageVersion = process.argv[3];
const wrapperPath = process.argv[4];

const distPath = `dist/${packageName}`;
const sourcePath = fs.existsSync(`${distPath}/browser`) ? `${distPath}/browser` : distPath;

// Flatten the structure if browser folder exists
if (fs.existsSync(`${distPath}/browser`)) {
  console.log(`Flattening ${distPath}/browser into ${distPath}`);
  // Copy everything from browser to distPath
  const files = fs.readdirSync(`${distPath}/browser`);
  files.forEach(file => {
    const oldPath = `${distPath}/browser/${file}`;
    const newPath = `${distPath}/${file}`;
    if (fs.existsSync(newPath) && fs.lstatSync(newPath).isDirectory()) {
      // If directory exists, we might need to merge or move. 
      // For simplicity in this build script, we'll just move if it doesn't exist or is empty.
      // But assets is likely the only dir.
      if (file === 'assets') {
         // move assets content
         const assetFiles = fs.readdirSync(oldPath);
         if (!fs.existsSync(newPath)) fs.mkdirSync(newPath);
         assetFiles.forEach(assetFile => {
           fs.renameSync(`${oldPath}/${assetFile}`, `${newPath}/${assetFile}`);
         });
      } else {
        fs.renameSync(oldPath, newPath);
      }
    } else {
      fs.renameSync(oldPath, newPath);
    }
  });
}

execSync(`node node_modules/iqb-dev-components/src/js_css_packer.js dist ${packageName} dist`);

const fileContent = fs.readFileSync(wrapperPath, 'utf8').toString()
  .replace(/version-placeholder/g, packageVersion);
fs.writeFileSync('dist/index.html', fileContent, 'utf8');

const targetFileName = `iqb-schemer@${packageVersion}.html`;
execSync(`node ./scripts/distpacker.js dist ${targetFileName} ${packageName}`);
