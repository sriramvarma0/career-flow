/**
 * CareerFlow SQLite -> Cloudflare D1 One-Time Migration Tool
 *
 * This script safely reads all application records from the local SQLite database
 * via Prisma Client and migrates them into Cloudflare D1 via the D1 REST API.
 *
 * Usage:
 *   npx tsx scripts/database/migrate-sqlite-to-d1.ts [--dry-run] [--verify-only] [--conflict-mode=stop|skip-existing|overwrite]
 *
 * Requirements:
 *   - Local SQLite database (DATABASE_URL in .env)
 *   - Cloudflare D1 credentials in .env:
 *       CLOUDFLARE_ACCOUNT_ID
 *       CLOUDFLARE_DATABASE_ID
 *       CLOUDFLARE_API_TOKEN
 */

import { PrismaClient } from "@prisma/client";
import { executeD1Query, executeD1Batch, D1Statement } from "../../src/infrastructure/database/d1-client";

interface MigrationOptions {
  dryRun: boolean;
  verifyOnly: boolean;
  conflictMode: "stop" | "skip-existing" | "overwrite";
  batchSize: number;
}

interface TableMigrationStats {
  tableName: string;
  sourceCount: number;
  migratedCount: number;
  skippedCount: number;
  targetCount: number;
  verified: boolean;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verifyOnly = args.includes("--verify-only");

  let conflictMode: "stop" | "skip-existing" | "overwrite" = "stop";
  const conflictArg = args.find((a) => a.startsWith("--conflict-mode="));
  if (conflictArg) {
    const val = conflictArg.split("=")[1].toLowerCase();
    if (val === "skip-existing" || val === "overwrite" || val === "stop") {
      conflictMode = val;
    } else {
      console.error(`Invalid --conflict-mode '${val}'. Valid options: stop, skip-existing, overwrite.`);
      process.exit(1);
    }
  }

  let batchSize = 25;
  const batchArg = args.find((a) => a.startsWith("--batch-size="));
  if (batchArg) {
    const val = parseInt(batchArg.split("=")[1], 10);
    if (!isNaN(val) && val > 0) batchSize = val;
  }

  return { dryRun, verifyOnly, conflictMode, batchSize };
}

function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

async function verifyD1SchemaExists(): Promise<void> {
  const expectedTables = [
    "User",
    "UserContact",
    "CustomStatus",
    "PasswordResetToken",
    "Application",
    "Document",
    "ApplicationNote",
    "StatusHistory",
  ];

  const res = await executeD1Query<Record<string, unknown>>(
    `SELECT name FROM sqlite_master WHERE type='table'`
  );

  const existingTables = new Set((res.results || []).map((r) => String(r.name)));
  const missingTables = expectedTables.filter((t) => !existingTables.has(t));

  if (missingTables.length > 0) {
    throw new Error(
      `Destination Cloudflare D1 database is missing required tables: ${missingTables.join(", ")}.\n` +
      `Please initialize the D1 schema first using:\n` +
      `  npx wrangler d1 execute <database-name> --file=scripts/database/d1-schema.sql`
    );
  }
}

async function checkD1TableCounts(): Promise<Record<string, number>> {
  const tables = [
    "User",
    "UserContact",
    "CustomStatus",
    "PasswordResetToken",
    "Application",
    "Document",
    "ApplicationNote",
    "StatusHistory",
  ];

  const counts: Record<string, number> = {};
  for (const table of tables) {
    const res = await executeD1Query<Record<string, unknown>>(`SELECT COUNT(*) as count FROM ${table}`);
    counts[table] = Number(res.results?.[0]?.count ?? 0);
  }
  return counts;
}

async function runMigration() {
  const options = parseArgs();

  console.log("===============================================================");
  console.log("  CareerFlow SQLite -> Cloudflare D1 Data Migration Tool");
  console.log("===============================================================\n");
  console.log(`Mode:            ${options.verifyOnly ? "VERIFY ONLY" : options.dryRun ? "DRY RUN (No writes)" : "LIVE MIGRATION"}`);
  console.log(`Conflict Mode:   ${options.conflictMode}`);
  console.log(`Batch Size:      ${options.batchSize}`);
  console.log("---------------------------------------------------------------\n");

  // Validate D1 Configuration presence without logging credentials
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    console.error("ERROR: Missing required Cloudflare D1 environment variables:");
    if (!accountId) console.error("  - CLOUDFLARE_ACCOUNT_ID");
    if (!databaseId) console.error("  - CLOUDFLARE_DATABASE_ID");
    if (!apiToken) console.error("  - CLOUDFLARE_API_TOKEN");
    console.error("\nPlease set these in your .env or environment before running the migration.\n");
    process.exit(1);
  }

  // Verify D1 tables exist
  console.log("-> Checking Cloudflare D1 schema tables...");
  try {
    await verifyD1SchemaExists();
    console.log("✓ Cloudflare D1 schema verified (all 8 tables exist).\n");
  } catch (err: any) {
    console.error(`ERROR: ${err.message}\n`);
    process.exit(1);
  }

  // Check destination table population
  const initialD1Counts = await checkD1TableCounts();
  const totalD1Rows = Object.values(initialD1Counts).reduce((a, b) => a + b, 0);

  if (totalD1Rows > 0) {
    console.log("WARNING: Destination D1 database already contains records:");
    for (const [table, count] of Object.entries(initialD1Counts)) {
      if (count > 0) console.log(`  - ${table}: ${count} rows`);
    }
    console.log();

    if (options.conflictMode === "stop" && !options.verifyOnly) {
      console.error(
        "MIGRATION HALTED: Destination Cloudflare D1 is not empty and --conflict-mode=stop.\n" +
        "To protect production data, this migration tool does not automatically overwrite records.\n" +
        "If you intentionally want to proceed, specify an explicit conflict mode:\n" +
        "  --conflict-mode=skip-existing (preserves existing D1 records and inserts new ones)\n" +
        "  --conflict-mode=overwrite     (replaces conflicting records with matching IDs)\n"
      );
      process.exit(1);
    }
  }

  const prisma = new PrismaClient();
  const stats: TableMigrationStats[] = [];

  try {
    // 1. Fetch all records from source SQLite
    console.log("-> Reading records from source SQLite database (read-only)...");
    const [
      users,
      userContacts,
      customStatuses,
      resetTokens,
      applications,
      documents,
      notes,
      statusHistory,
    ] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.userContact.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.customStatus.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.passwordResetToken.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.application.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.document.findMany({ orderBy: { uploadedAt: "asc" } }),
      prisma.applicationNote.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.statusHistory.findMany({ orderBy: { id: "asc" } }),
    ]);

    console.log(`  - Users:                 ${users.length}`);
    console.log(`  - User Contacts:         ${userContacts.length}`);
    console.log(`  - Custom Statuses:       ${customStatuses.length}`);
    console.log(`  - Password Reset Tokens: ${resetTokens.length}`);
    console.log(`  - Applications:          ${applications.length}`);
    console.log(`  - Documents:             ${documents.length}`);
    console.log(`  - Application Notes:     ${notes.length}`);
    console.log(`  - Status History:        ${statusHistory.length}\n`);

    if (options.verifyOnly) {
      console.log("-> Running verification between SQLite and D1...");
      await verifyMigration(prisma, users, userContacts, customStatuses, resetTokens, applications, documents, notes, statusHistory);
      await prisma.$disconnect();
      return;
    }

    // Helper to generate INSERT statements based on conflict mode
    const getInsertSql = (tableName: string, columns: string[]) => {
      const colList = columns.join(", ");
      const placeholders = columns.map(() => "?").join(", ");
      if (options.conflictMode === "overwrite") {
        return `INSERT OR REPLACE INTO ${tableName} (${colList}) VALUES (${placeholders})`;
      } else if (options.conflictMode === "skip-existing") {
        return `INSERT OR IGNORE INTO ${tableName} (${colList}) VALUES (${placeholders})`;
      }
      return `INSERT INTO ${tableName} (${colList}) VALUES (${placeholders})`;
    };

    // Helper to execute batch migrations in chunks
    async function migrateTable<T>(
      tableName: string,
      records: T[],
      columns: string[],
      mapRow: (item: T) => unknown[]
    ): Promise<TableMigrationStats> {
      console.log(`-> Migrating table '${tableName}' (${records.length} records)...`);

      if (records.length === 0) {
        console.log(`   No records to migrate for '${tableName}'.\n`);
        return {
          tableName,
          sourceCount: 0,
          migratedCount: 0,
          skippedCount: 0,
          targetCount: initialD1Counts[tableName] || 0,
          verified: true,
        };
      }

      if (options.dryRun) {
        console.log(`   [DRY RUN] Would insert ${records.length} records into '${tableName}'.\n`);
        return {
          tableName,
          sourceCount: records.length,
          migratedCount: records.length,
          skippedCount: 0,
          targetCount: records.length,
          verified: true,
        };
      }

      const insertSql = getInsertSql(tableName, columns);
      let totalInserted = 0;

      for (let i = 0; i < records.length; i += options.batchSize) {
        const chunk = records.slice(i, i + options.batchSize);
        const batchStmts: D1Statement[] = chunk.map((item) => ({
          sql: insertSql,
          params: mapRow(item),
        }));

        await executeD1Batch(batchStmts);
        totalInserted += chunk.length;
        process.stdout.write(`   Migrated ${totalInserted}/${records.length} records (${Math.round((totalInserted / records.length) * 100)}%)\r`);
      }
      console.log(`\n✓ '${tableName}' migration completed.\n`);

      const finalCountRes = await executeD1Query<Record<string, unknown>>(`SELECT COUNT(*) as count FROM ${tableName}`);
      const targetCount = Number(finalCountRes.results?.[0]?.count ?? 0);

      return {
        tableName,
        sourceCount: records.length,
        migratedCount: totalInserted,
        skippedCount: 0,
        targetCount,
        verified: targetCount >= records.length,
      };
    }

    // Step 1: User table
    stats.push(
      await migrateTable(
        "User",
        users,
        ["id", "fullName", "passwordHash", "createdAt", "updatedAt"],
        (u) => [u.id, u.fullName, u.passwordHash, formatDate(u.createdAt), formatDate(u.updatedAt)]
      )
    );

    // Step 2: UserContact table
    stats.push(
      await migrateTable(
        "UserContact",
        userContacts,
        ["id", "userId", "type", "value", "normalizedValue", "isPrimary", "isVerified", "createdAt", "updatedAt"],
        (uc) => [
          uc.id,
          uc.userId,
          uc.type,
          uc.value,
          uc.normalizedValue,
          uc.isPrimary ? 1 : 0,
          uc.isVerified ? 1 : 0,
          formatDate(uc.createdAt),
          formatDate(uc.updatedAt),
        ]
      )
    );

    // Step 3: CustomStatus table
    stats.push(
      await migrateTable(
        "CustomStatus",
        customStatuses,
        ["id", "userId", "name", "linkedStatus", "createdAt"],
        (cs) => [cs.id, cs.userId, cs.name, cs.linkedStatus, formatDate(cs.createdAt)]
      )
    );

    // Step 4: PasswordResetToken table
    stats.push(
      await migrateTable(
        "PasswordResetToken",
        resetTokens,
        ["id", "userId", "tokenHash", "expiresAt", "usedAt", "createdAt"],
        (rt) => [rt.id, rt.userId, rt.tokenHash, formatDate(rt.expiresAt), formatDate(rt.usedAt), formatDate(rt.createdAt)]
      )
    );

    // Step 5: Application table
    stats.push(
      await migrateTable(
        "Application",
        applications,
        [
          "id",
          "userId",
          "companyName",
          "jobTitle",
          "applicationReferenceId",
          "source",
          "status",
          "appliedDate",
          "jobUrl",
          "location",
          "salary",
          "experience",
          "appliedPlatform",
          "jobId",
          "notes",
          "createdAt",
          "updatedAt",
        ],
        (a) => [
          a.id,
          a.userId,
          a.companyName,
          a.jobTitle,
          a.applicationReferenceId || null,
          a.source || "Other",
          a.status || "Applied",
          formatDate(a.appliedDate),
          a.jobUrl || null,
          a.location || null,
          a.salary || null,
          a.experience || null,
          a.appliedPlatform || null,
          a.jobId || null,
          a.notes || null,
          formatDate(a.createdAt),
          formatDate(a.updatedAt),
        ]
      )
    );

    // Step 6: Document table
    stats.push(
      await migrateTable(
        "Document",
        documents,
        ["id", "applicationId", "fileName", "originalFileName", "storageKey", "fileSize", "mimeType", "tags", "uploadedAt"],
        (d) => [
          d.id,
          d.applicationId,
          d.fileName,
          d.originalFileName,
          d.storageKey,
          d.fileSize,
          d.mimeType,
          d.tags || "",
          formatDate(d.uploadedAt),
        ]
      )
    );

    // Step 7: ApplicationNote table
    stats.push(
      await migrateTable(
        "ApplicationNote",
        notes,
        ["id", "applicationId", "content", "createdAt", "updatedAt"],
        (n) => [n.id, n.applicationId, n.content, formatDate(n.createdAt), formatDate(n.updatedAt)]
      )
    );

    // Step 8: StatusHistory table
    stats.push(
      await migrateTable(
        "StatusHistory",
        statusHistory,
        ["id", "applicationId", "previousStatus", "newStatus", "changedAt"],
        (sh) => [sh.id, sh.applicationId, sh.previousStatus || null, sh.newStatus, formatDate(sh.changedAt)]
      )
    );

    // Run Post-Migration Verification
    if (!options.dryRun) {
      console.log("-> Performing Post-Migration Verification...");
      await verifyMigration(prisma, users, userContacts, customStatuses, resetTokens, applications, documents, notes, statusHistory);
    }

    console.log("===============================================================");
    console.log("  MIGRATION SUMMARY");
    console.log("===============================================================");
    console.table(
      stats.map((s) => ({
        Table: s.tableName,
        "Source Rows": s.sourceCount,
        "Migrated Rows": s.migratedCount,
        "D1 Rows": s.targetCount,
        Status: s.verified ? "OK" : "MISMATCH",
      }))
    );
    console.log("✓ Migration procedure completed successfully!");
    console.log("Note: Source SQLite database was kept completely intact.\n");
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyMigration(
  prisma: PrismaClient,
  users: any[],
  userContacts: any[],
  customStatuses: any[],
  resetTokens: any[],
  applications: any[],
  documents: any[],
  notes: any[],
  statusHistory: any[]
) {
  console.log("1. Checking Table Row Counts:");
  const d1Counts = await checkD1TableCounts();
  const sourceMap: Record<string, number> = {
    User: users.length,
    UserContact: userContacts.length,
    CustomStatus: customStatuses.length,
    PasswordResetToken: resetTokens.length,
    Application: applications.length,
    Document: documents.length,
    ApplicationNote: notes.length,
    StatusHistory: statusHistory.length,
  };

  let countMismatch = false;
  for (const [table, srcCount] of Object.entries(sourceMap)) {
    const d1Count = d1Counts[table] || 0;
    const match = d1Count >= srcCount;
    if (!match) countMismatch = true;
    console.log(`   - ${table.padEnd(20)}: Source=${srcCount} | D1=${d1Count} ${match ? "✓" : "✗ MISMATCH"}`);
  }

  if (countMismatch) {
    console.warn("\nWARNING: Some table counts in D1 are lower than the source SQLite database.\n");
  } else {
    console.log("\n✓ All table row counts in D1 match or exceed source SQLite counts.\n");
  }

  console.log("2. Checking Referential Integrity in D1:");
  // Check orphaned userContacts
  const orphanedContacts = await executeD1Query<Record<string, unknown>>(
    `SELECT COUNT(*) as count FROM UserContact WHERE userId NOT IN (SELECT id FROM User)`
  );
  console.log(`   - Orphaned UserContacts:       ${orphanedContacts.results?.[0]?.count ?? 0}`);

  // Check orphaned customStatuses
  const orphanedStatuses = await executeD1Query<Record<string, unknown>>(
    `SELECT COUNT(*) as count FROM CustomStatus WHERE userId NOT IN (SELECT id FROM User)`
  );
  console.log(`   - Orphaned CustomStatuses:     ${orphanedStatuses.results?.[0]?.count ?? 0}`);

  // Check orphaned applications
  const orphanedApps = await executeD1Query<Record<string, unknown>>(
    `SELECT COUNT(*) as count FROM Application WHERE userId NOT IN (SELECT id FROM User)`
  );
  console.log(`   - Orphaned Applications:       ${orphanedApps.results?.[0]?.count ?? 0}`);

  // Check orphaned documents
  const orphanedDocs = await executeD1Query<Record<string, unknown>>(
    `SELECT COUNT(*) as count FROM Document WHERE applicationId NOT IN (SELECT id FROM Application)`
  );
  console.log(`   - Orphaned Documents:          ${orphanedDocs.results?.[0]?.count ?? 0}`);

  // Check orphaned notes
  const orphanedNotes = await executeD1Query<Record<string, unknown>>(
    `SELECT COUNT(*) as count FROM ApplicationNote WHERE applicationId NOT IN (SELECT id FROM Application)`
  );
  console.log(`   - Orphaned ApplicationNotes:   ${orphanedNotes.results?.[0]?.count ?? 0}`);

  // Check orphaned status history
  const orphanedHistory = await executeD1Query<Record<string, unknown>>(
    `SELECT COUNT(*) as count FROM StatusHistory WHERE applicationId NOT IN (SELECT id FROM Application)`
  );
  console.log(`   - Orphaned StatusHistory:      ${orphanedHistory.results?.[0]?.count ?? 0}`);

  console.log("\n3. Checking Sample Record Lookups:");
  if (users.length > 0) {
    const sampleUser = users[0];
    const d1User = await executeD1Query<Record<string, unknown>>(
      `SELECT id, fullName, createdAt FROM User WHERE id = ? LIMIT 1`,
      [sampleUser.id]
    );
    if (d1User.results?.[0] && String(d1User.results[0].fullName) === sampleUser.fullName) {
      console.log(`   ✓ Sample User lookup verified (ID: ${sampleUser.id})`);
    } else {
      console.error(`   ✗ Sample User lookup failed for ID: ${sampleUser.id}`);
    }
  }

  if (applications.length > 0) {
    const sampleApp = applications[0];
    const d1App = await executeD1Query<Record<string, unknown>>(
      `SELECT id, companyName, jobTitle FROM Application WHERE id = ? LIMIT 1`,
      [sampleApp.id]
    );
    if (d1App.results?.[0] && String(d1App.results[0].companyName) === sampleApp.companyName) {
      console.log(`   ✓ Sample Application lookup verified (ID: ${sampleApp.id})`);
    } else {
      console.error(`   ✗ Sample Application lookup failed for ID: ${sampleApp.id}`);
    }
  }
  console.log();
}

runMigration().catch((err) => {
  console.error("\nMigration Script Error:", err);
  process.exit(1);
});
