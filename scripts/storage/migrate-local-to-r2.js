import { PrismaClient } from "@prisma/client";
import { CloudStorageProvider } from "../../src/infrastructure/storage/cloud-provider";
import { LocalStorageProvider } from "../../src/infrastructure/storage/local-provider";
import { getEnvConfig } from "../../src/infrastructure/config/env";

async function migrateLocalToR2() {
  console.log("=== CareerFlow Local Storage -> Cloudflare R2 Migration Utility ===\n");

  const env = getEnvConfig();
  if (env.storageProvider !== "cloud" || !env.s3) {
    console.error("ERROR: STORAGE_PROVIDER must be set to 'cloud' and S3 credentials configured in .env to run R2 migration.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const localProvider = new LocalStorageProvider();
  const cloudProvider = new CloudStorageProvider();

  const documents = await prisma.document.findMany();
  console.log(`Found ${documents.length} document records to verify and migrate to R2.\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of documents) {
    const key = doc.storageKey;
    console.log(`Checking Document ID: ${doc.id} | Key: '${key}'`);

    const localExists = await localProvider.exists(key);
    if (!localExists) {
      console.log(` -> WARN: Local file not found for key '${key}'. Skipping.\n`);
      failed++;
      continue;
    }

    const r2Exists = await cloudProvider.exists(key);
    if (r2Exists) {
      console.log(` -> INFO: Object already exists in Cloudflare R2. Skipping.\n`);
      skipped++;
      continue;
    }

    try {
      const fileData = await localProvider.download(key);
      const buffer = fileData.stream instanceof Buffer ? fileData.stream : Buffer.from(fileData.stream as any);
      
      console.log(` -> Uploading to Cloudflare R2...`);
      await cloudProvider.upload(key, buffer, doc.mimeType);

      const verifyExists = await cloudProvider.exists(key);
      if (verifyExists) {
        console.log(` -> SUCCESS: Uploaded and verified in R2.\n`);
        success++;
      } else {
        console.error(` -> ERROR: Verification failed after upload.\n`);
        failed++;
      }
    } catch (err: any) {
      console.error(` -> FAILED: ${err.message}\n`);
      failed++;
    }
  }

  console.log("----------------------------------------");
  console.log("Migration Summary:");
  console.log(`Total Document Records: ${documents.length}`);
  console.log(`Uploaded to R2:        ${success}`);
  console.log(`Already in R2:         ${skipped}`);
  console.log(`Failed / Missing:      ${failed}`);
  console.log("----------------------------------------");
  console.log("Note: Local source files were preserved under storage/.\n");

  await prisma.$disconnect();
}

migrateLocalToR2().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
