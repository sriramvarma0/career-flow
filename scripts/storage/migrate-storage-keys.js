import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import fs from "node:fs";
import path from "node:path";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`[StorageKey Migration] Starting migration (Dry run: ${isDryRun})...\n`);

  const documents = await prisma.document.findMany({
    include: {
      application: {
        select: {
          userId: true,
        },
      },
    },
  });

  console.log(`Found ${documents.length} document records in database.\n`);

  let successCount = 0;
  let missingCount = 0;
  let failedCount = 0;

  const storageRoot = path.join(process.cwd(), "storage");

  for (const doc of documents) {
    const rawVal = doc.storageKey; // currently holds old path or raw string
    let userId = doc.application?.userId;
    let fileName = doc.fileName;

    let relativeKey = "";

    if (rawVal.includes("users")) {
      const idx = rawVal.indexOf("users");
      relativeKey = rawVal.substring(idx).replace(/\\/g, "/");
    } else if (userId && doc.applicationId && fileName) {
      relativeKey = `users/user_${userId}/application_${doc.applicationId}/${fileName}`;
    } else {
      relativeKey = doc.fileName;
    }

    const physicalPath = path.join(storageRoot, relativeKey);
    const fileExistsOnDisk = fs.existsSync(physicalPath) || (fs.existsSync(rawVal) && fs.statSync(rawVal).isFile());

    console.log(`Document ID:     ${doc.id}`);
    console.log(`Raw storageKey:  ${rawVal}`);
    console.log(`Target Key:      ${relativeKey}`);
    console.log(`Physical Exists: ${fileExistsOnDisk ? "YES" : "NO (" + physicalPath + ")"}`);

    if (!fileExistsOnDisk) {
      missingCount++;
    }

    if (isDryRun) {
      console.log(`Status:          [DRY-RUN] No database update executed.\n`);
    } else {
      try {
        await prisma.document.update({
          where: { id: doc.id },
          data: { storageKey: relativeKey },
        });
        successCount++;
        console.log(`Status:          [UPDATED]\n`);
      } catch (err) {
        failedCount++;
        console.error(`Status:          [FAILED] ${err.message}\n`);
      }
    }
  }

  console.log("----------------------------------------");
  console.log(`Migration Summary (${isDryRun ? "DRY-RUN" : "LIVE"}):`);
  console.log(`Documents found:       ${documents.length}`);
  if (!isDryRun) {
    console.log(`Successfully migrated: ${successCount}`);
  }
  console.log(`Missing physical files:${missingCount}`);
  console.log(`Failed DB records:     ${failedCount}`);
  console.log("----------------------------------------");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
