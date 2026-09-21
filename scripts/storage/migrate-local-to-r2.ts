/**
 * CareerFlow Local Storage -> Cloudflare R2 Document Migration Tool
 *
 * Safely reads all document files from local disk (under storage/)
 * and uploads them to Cloudflare R2 (bucket: career-flow-doc)
 * while preserving the exact `storageKey` metadata.
 *
 * Usage:
 *   npx tsx scripts/storage/migrate-local-to-r2.ts [--dry-run] [--verify-only]
 *
 * Requirements in .env:
 *   STORAGE_PROVIDER=cloud
 *   S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
 *   S3_BUCKET=career-flow-doc
 *   S3_ACCESS_KEY_ID=<r2_access_key_id>
 *   S3_SECRET_ACCESS_KEY=<r2_secret_access_key>
 */

import { PrismaClient } from "@prisma/client";
import { CloudStorageProvider } from "../../src/infrastructure/storage/cloud-provider";
import { LocalStorageProvider } from "../../src/infrastructure/storage/local-provider";
import { getEnvConfig } from "../../src/infrastructure/config/env";

interface R2MigrationOptions {
  dryRun: boolean;
  verifyOnly: boolean;
}

function parseArgs(): R2MigrationOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    verifyOnly: args.includes("--verify-only"),
  };
}

async function runR2Migration() {
  const options = parseArgs();

  console.log("===============================================================");
  console.log("  CareerFlow Local Documents -> Cloudflare R2 Migration Tool");
  console.log("===============================================================\n");
  console.log(`Mode: ${options.verifyOnly ? "VERIFY ONLY" : options.dryRun ? "DRY RUN (No uploads)" : "LIVE UPLOAD"}\n`);

  const env = getEnvConfig();
  if (env.storageProvider !== "cloud" || !env.s3) {
    console.error("ERROR: STORAGE_PROVIDER must be configured as 'cloud' and S3 credentials supplied in .env.");
    console.error("Required variables:");
    console.error("  - STORAGE_PROVIDER=cloud");
    console.error("  - S3_ENDPOINT");
    console.error("  - S3_BUCKET (e.g. career-flow-doc)");
    console.error("  - S3_ACCESS_KEY_ID");
    console.error("  - S3_SECRET_ACCESS_KEY\n");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const localProvider = new LocalStorageProvider();
  const cloudProvider = new CloudStorageProvider();

  try {
    const documents = await prisma.document.findMany({
      orderBy: { uploadedAt: "asc" },
    });

    console.log(`Found ${documents.length} document record(s) in database.\n`);

    let uploadedCount = 0;
    let alreadyInR2Count = 0;
    let missingLocalCount = 0;
    let failedCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const key = doc.storageKey;
      console.log(`[${i + 1}/${documents.length}] Document ID: ${doc.id} | Name: "${doc.originalFileName}"`);
      console.log(`      Storage Key: ${key}`);

      const localExists = await localProvider.exists(key);
      if (!localExists) {
        console.warn(`      ⚠️ WARN: Local file missing at key '${key}'\n`);
        missingLocalCount++;
        continue;
      }

      const r2Exists = await cloudProvider.exists(key);
      if (r2Exists) {
        console.log(`      ✓ Already present in Cloudflare R2 bucket. Skipping.\n`);
        alreadyInR2Count++;
        continue;
      }

      if (options.verifyOnly) {
        console.log(`      ✗ Not found in Cloudflare R2.\n`);
        continue;
      }

      if (options.dryRun) {
        console.log(`      [DRY RUN] Would upload local file (${doc.fileSize} bytes) -> R2 key '${key}'\n`);
        uploadedCount++;
        continue;
      }

      try {
        const fileData = await localProvider.download(key);
        const buffer = fileData.stream instanceof Buffer ? fileData.stream : Buffer.from(fileData.stream as any);

        console.log(`      Uploading ${buffer.length} bytes to R2...`);
        await cloudProvider.upload(key, buffer, doc.mimeType);

        const verified = await cloudProvider.exists(key);
        if (verified) {
          console.log(`      ✓ Successfully uploaded and verified in R2.\n`);
          uploadedCount++;
        } else {
          console.error(`      ✗ ERROR: Upload completed but HeadObject verification failed.\n`);
          failedCount++;
        }
      } catch (err: any) {
        console.error(`      ✗ Upload failed: ${err.message}\n`);
        failedCount++;
      }
    }

    console.log("===============================================================");
    console.log("  R2 MIGRATION SUMMARY");
    console.log("===============================================================");
    console.log(`Total Database Document Records: ${documents.length}`);
    console.log(`Uploaded to Cloudflare R2:       ${uploadedCount}`);
    console.log(`Already Present in R2:           ${alreadyInR2Count}`);
    console.log(`Missing Local Files:             ${missingLocalCount}`);
    console.log(`Upload Failures:                 ${failedCount}`);
    console.log("---------------------------------------------------------------");
    console.log("Note: Source local files in storage/ were preserved untouched.\n");
  } finally {
    await prisma.$disconnect();
  }
}

runR2Migration().catch((err) => {
  console.error("\nR2 Migration Failed:", err);
  process.exit(1);
});
