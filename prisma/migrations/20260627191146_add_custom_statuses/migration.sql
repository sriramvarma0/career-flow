-- AlterTable
ALTER TABLE "Application" ADD COLUMN "appliedPlatform" TEXT;
ALTER TABLE "Application" ADD COLUMN "experience" TEXT;
ALTER TABLE "Application" ADD COLUMN "jobId" TEXT;

-- CreateTable
CREATE TABLE "CustomStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("applicationId", "fileName", "filePath", "fileSize", "id", "mimeType", "originalFileName", "uploadedAt") SELECT "applicationId", "fileName", "filePath", "fileSize", "id", "mimeType", "originalFileName", "uploadedAt" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_applicationId_idx" ON "Document"("applicationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CustomStatus_userId_idx" ON "CustomStatus"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomStatus_userId_name_key" ON "CustomStatus"("userId", "name");
