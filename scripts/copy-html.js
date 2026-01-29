import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTML files to copy to dist folder
const htmlFiles = [
  'shop.html',
  'about.html',
  'contact.html',
  'product-detail.html'
];

const distDir = path.join(__dirname, '..', 'dist');
const rootDir = path.join(__dirname, '..');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy HTML files
htmlFiles.forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} to dist/`);
  } else {
    console.warn(`⚠ File not found: ${file}`);
  }
});

// Copy JS directory
const jsSrc = path.join(rootDir, 'js');
const jsDest = path.join(distDir, 'js');

if (fs.existsSync(jsSrc)) {
  if (!fs.existsSync(jsDest)) {
    fs.mkdirSync(jsDest, { recursive: true });
  }
  
  const jsFiles = fs.readdirSync(jsSrc);
  jsFiles.forEach(file => {
    const src = path.join(jsSrc, file);
    const dest = path.join(jsDest, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied js/${file} to dist/js/`);
    }
  });
}

// Copy style.css
const styleSrc = path.join(rootDir, 'style.css');
const styleDest = path.join(distDir, 'style.css');

if (fs.existsSync(styleSrc)) {
  fs.copyFileSync(styleSrc, styleDest);
  console.log(`✓ Copied style.css to dist/`);
}

console.log('✅ All static files copied to dist/');
