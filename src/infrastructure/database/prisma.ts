import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { getDatabaseUrl } from "../config/env";

function runFailsafeBackup() {
  if (process.env.NODE_ENV !== "development" || process.env.DATABASE_PROVIDER === "d1") return;

  try {
    const dbPath = path.join(process.cwd(), "data", "database", "dev.db");
    const backupsDir = path.join(process.cwd(), "data", "backups");
    
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      const lastBackupFile = path.join(backupsDir, ".last_backup");
      let shouldBackup = true;
      
      if (fs.existsSync(lastBackupFile)) {
        const lastBackupTime = Number(fs.readFileSync(lastBackupFile, "utf-8"));
        if (Date.now() - lastBackupTime < 60 * 60 * 1000) {
          shouldBackup = false;
        }
      }

      if (shouldBackup) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(backupsDir, `dev-backup-${timestamp}.db`);
        fs.copyFileSync(dbPath, backupPath);
        fs.writeFileSync(lastBackupFile, String(Date.now()));
        console.log(`[FailSafe] Database backed up successfully to: ${backupPath}`);
        
        const backups = fs.readdirSync(backupsDir)
          .filter(f => f.startsWith("dev-backup-") && f.endsWith(".db"))
          .map(f => ({ name: f, path: path.join(backupsDir, f), time: fs.statSync(path.join(backupsDir, f)).mtimeMs }))
          .sort((a, b) => b.time - a.time);
          
        if (backups.length > 10) {
          for (let i = 10; i < backups.length; i++) {
            fs.unlinkSync(backups[i].path);
          }
        }
      }
    }
  } catch (error) {
    console.error("[FailSafe] Failed to backup database:", error);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Validate DATABASE_URL lazily when Prisma Client is first accessed at runtime
    getDatabaseUrl();
    runFailsafeBackup();
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const instance = getPrismaClient();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
