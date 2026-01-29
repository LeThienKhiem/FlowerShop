import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// Assets in git at repo root (or icon/) that must be in public/ for the app to serve them
const toSync = [
  { from: path.join(rootDir, 'bannerhero.png'), name: 'bannerhero.png' },
  { from: path.join(rootDir, 'logo_black.png'), name: 'logo_black.png' },
  { from: path.join(rootDir, 'icon', 'logo_black.png'), name: 'logo_black.png' },
];

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy each; for logo, use first source that exists so root and icon are both tried
const done = new Set();
toSync.forEach(({ from, name }) => {
  if (fs.existsSync(from) && !done.has(name)) {
    fs.copyFileSync(from, path.join(publicDir, name));
    console.log(`✓ Synced ${path.relative(rootDir, from)} -> public/${name}`);
    done.add(name);
  }
});

console.log('✅ Public assets synced');
