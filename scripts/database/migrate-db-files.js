const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const srcDb = path.join(projectRoot, 'storage', 'db', 'dev.db');
const destDbDir = path.join(projectRoot, 'data', 'database');
const destDb = path.join(destDbDir, 'dev.db');

const srcBackups = path.join(projectRoot, 'storage', 'backups');
const destBackups = path.join(projectRoot, 'data', 'backups');

console.log('[Data Migration] Checking source DB:', srcDb);
if (fs.existsSync(srcDb)) {
  if (!fs.existsSync(destDbDir)) {
    fs.mkdirSync(destDbDir, { recursive: true });
  }
  if (!fs.existsSync(destDb)) {
    fs.copyFileSync(srcDb, destDb);
    console.log('[Data Migration] Successfully copied dev.db to data/database/dev.db');
  } else {
    console.log('[Data Migration] data/database/dev.db already exists.');
  }
} else {
  console.log('[Data Migration] Source DB not found, skipping copy.');
}

if (fs.existsSync(srcBackups)) {
  if (!fs.existsSync(destBackups)) {
    fs.mkdirSync(destBackups, { recursive: true });
  }
  const files = fs.readdirSync(srcBackups);
  for (const f of files) {
    const srcFile = path.join(srcBackups, f);
    const destFile = path.join(destBackups, f);
    if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`[Data Migration] Copied backup ${f} -> data/backups/`);
    }
  }
}

console.log('[Data Migration] Setup completed.');
