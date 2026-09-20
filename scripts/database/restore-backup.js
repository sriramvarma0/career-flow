const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const backupsDir = path.join(projectRoot, 'data', 'backups');
const dbPath = path.join(projectRoot, 'data', 'database', 'dev.db');

if (!fs.existsSync(backupsDir)) {
  console.error("No backups directory found.");
  process.exit(1);
}

const backups = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith("dev-backup-") && f.endsWith(".db"))
  .map(f => ({ name: f, path: path.join(backupsDir, f), time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time);

if (backups.length === 0) {
  console.log("No database backup files found.");
  process.exit(1);
}

const latest = backups[0];
console.log(`Restoring database to latest backup: ${latest.name}...`);
try {
  fs.copyFileSync(latest.path, dbPath);
  console.log("Database successfully restored!");
} catch (error) {
  console.error("Failed to restore backup:", error);
}
