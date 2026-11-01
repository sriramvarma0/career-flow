import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * CareerFlow SQLite -> Cloudflare D1 SQL Exporter
 *
 * Reads all data from the local SQLite database via Prisma Client (read-only)
 * and generates a D1-compatible SQL file with standard INSERT statements in dependency order.
 */

function sqlValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "NULL";
  }
  if (typeof val === "boolean") {
    return val ? "1" : "0";
  }
  if (typeof val === "number") {
    return Number.isFinite(val) ? val.toString() : "NULL";
  }
  if (typeof val === "bigint") {
    return val.toString();
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (typeof val === "string") {
    return `'${val.replace(/'/g, "''")}'`;
  }
  return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
}

function generateInsertSql(tableName: string, columns: string[], rows: unknown[][]): string[] {
  if (rows.length === 0) return [];
  const colList = columns.join(", ");
  return rows.map((row) => {
    const valuesList = row.map(sqlValue).join(", ");
    return `INSERT INTO ${tableName} (${colList}) VALUES (${valuesList});`;
  });
}

async function exportData() {
  const prisma = new PrismaClient();
  const outputPath = path.resolve(__dirname, "d1-data-export.sql");

  console.log("===============================================================");
  console.log("  CareerFlow Local SQLite -> Cloudflare D1 SQL Generator");
  console.log("===============================================================\n");
  console.log("-> Reading records from local SQLite database (read-only)...");

  try {
    // Read all tables in dependency order
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

    const stats = [
      { Table: "User", "Source Rows": users.length, Order: 1 },
      { Table: "UserContact", "Source Rows": userContacts.length, Order: 2 },
      { Table: "CustomStatus", "Source Rows": customStatuses.length, Order: 3 },
      { Table: "PasswordResetToken", "Source Rows": resetTokens.length, Order: 4 },
      { Table: "Application", "Source Rows": applications.length, Order: 5 },
      { Table: "Document", "Source Rows": documents.length, Order: 6 },
      { Table: "ApplicationNote", "Source Rows": notes.length, Order: 7 },
      { Table: "StatusHistory", "Source Rows": statusHistory.length, Order: 8 },
    ];

    console.log("\nSource Database Record Counts:");
    console.table(stats);

    const totalRecords = stats.reduce((acc, s) => acc + s["Source Rows"], 0);
    console.log(`Total records to export: ${totalRecords}\n`);

    const sqlLines: string[] = [];
    sqlLines.push("-- CareerFlow Data Export for Cloudflare D1");
    sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
    sqlLines.push(`-- Total Records: ${totalRecords}`);
    sqlLines.push("");

    // 1. User
    if (users.length > 0) {
      sqlLines.push(`-- Table: User (${users.length} rows)`);
      const userRows = users.map((u) => [u.id, u.fullName, u.passwordHash, u.createdAt, u.updatedAt]);
      sqlLines.push(
        ...generateInsertSql("User", ["id", "fullName", "passwordHash", "createdAt", "updatedAt"], userRows)
      );
      sqlLines.push("");
    }

    // 2. UserContact
    if (userContacts.length > 0) {
      sqlLines.push(`-- Table: UserContact (${userContacts.length} rows)`);
      const contactRows = userContacts.map((uc) => [
        uc.id,
        uc.userId,
        uc.type,
        uc.value,
        uc.normalizedValue,
        uc.isPrimary,
        uc.isVerified,
        uc.createdAt,
        uc.updatedAt,
      ]);
      sqlLines.push(
        ...generateInsertSql(
          "UserContact",
          ["id", "userId", "type", "value", "normalizedValue", "isPrimary", "isVerified", "createdAt", "updatedAt"],
          contactRows
        )
      );
      sqlLines.push("");
    }

    // 3. CustomStatus
    if (customStatuses.length > 0) {
      sqlLines.push(`-- Table: CustomStatus (${customStatuses.length} rows)`);
      const customStatusRows = customStatuses.map((cs) => [
        cs.id,
        cs.userId,
        cs.name,
        cs.linkedStatus,
        cs.createdAt,
      ]);
      sqlLines.push(
        ...generateInsertSql("CustomStatus", ["id", "userId", "name", "linkedStatus", "createdAt"], customStatusRows)
      );
      sqlLines.push("");
    }

    // 4. PasswordResetToken
    if (resetTokens.length > 0) {
      sqlLines.push(`-- Table: PasswordResetToken (${resetTokens.length} rows)`);
      const resetTokenRows = resetTokens.map((rt) => [
        rt.id,
        rt.userId,
        rt.tokenHash,
        rt.expiresAt,
        rt.usedAt,
        rt.createdAt,
      ]);
      sqlLines.push(
        ...generateInsertSql(
          "PasswordResetToken",
          ["id", "userId", "tokenHash", "expiresAt", "usedAt", "createdAt"],
          resetTokenRows
        )
      );
      sqlLines.push("");
    }

    // 5. Application
    if (applications.length > 0) {
      sqlLines.push(`-- Table: Application (${applications.length} rows)`);
      const appRows = applications.map((a) => [
        a.id,
        a.userId,
        a.companyName,
        a.jobTitle,
        a.applicationReferenceId,
        a.source,
        a.status,
        a.appliedDate,
        a.jobUrl,
        a.location,
        a.salary,
        a.experience,
        a.appliedPlatform,
        a.jobId,
        a.notes,
        a.createdAt,
        a.updatedAt,
      ]);
      sqlLines.push(
        ...generateInsertSql(
          "Application",
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
          appRows
        )
      );
      sqlLines.push("");
    }

    // 6. Document
    if (documents.length > 0) {
      sqlLines.push(`-- Table: Document (${documents.length} rows)`);
      const docRows = documents.map((d) => [
        d.id,
        d.applicationId,
        d.fileName,
        d.originalFileName,
        d.storageKey,
        d.fileSize,
        d.mimeType,
        d.tags,
        d.uploadedAt,
      ]);
      sqlLines.push(
        ...generateInsertSql(
          "Document",
          [
            "id",
            "applicationId",
            "fileName",
            "originalFileName",
            "storageKey",
            "fileSize",
            "mimeType",
            "tags",
            "uploadedAt",
          ],
          docRows
        )
      );
      sqlLines.push("");
    }

    // 7. ApplicationNote
    if (notes.length > 0) {
      sqlLines.push(`-- Table: ApplicationNote (${notes.length} rows)`);
      const noteRows = notes.map((n) => [n.id, n.applicationId, n.content, n.createdAt, n.updatedAt]);
      sqlLines.push(
        ...generateInsertSql(
          "ApplicationNote",
          ["id", "applicationId", "content", "createdAt", "updatedAt"],
          noteRows
        )
      );
      sqlLines.push("");
    }

    // 8. StatusHistory
    if (statusHistory.length > 0) {
      sqlLines.push(`-- Table: StatusHistory (${statusHistory.length} rows)`);
      const historyRows = statusHistory.map((sh) => [
        sh.id,
        sh.applicationId,
        sh.previousStatus,
        sh.newStatus,
        sh.changedAt,
      ]);
      sqlLines.push(
        ...generateInsertSql(
          "StatusHistory",
          ["id", "applicationId", "previousStatus", "newStatus", "changedAt"],
          historyRows
        )
      );
      sqlLines.push("");
    }

    fs.writeFileSync(outputPath, sqlLines.join("\n"), "utf8");
    console.log(`✓ SQL file generated successfully:`);
    console.log(`  ${outputPath}`);
    console.log(`\nYou can execute this file with Wrangler:`);
    console.log(`  npx wrangler d1 execute career-flow-db --remote --file=scripts/database/d1-data-export.sql\n`);
  } finally {
    await prisma.$disconnect();
  }
}

exportData().catch((err) => {
  console.error("\nExport Error:", err);
  process.exit(1);
});
