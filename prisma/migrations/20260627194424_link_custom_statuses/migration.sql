-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkedStatus" TEXT NOT NULL DEFAULT 'Applied',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CustomStatus" ("createdAt", "id", "name", "userId") SELECT "createdAt", "id", "name", "userId" FROM "CustomStatus";
DROP TABLE "CustomStatus";
ALTER TABLE "new_CustomStatus" RENAME TO "CustomStatus";
CREATE INDEX "CustomStatus_userId_idx" ON "CustomStatus"("userId");
CREATE UNIQUE INDEX "CustomStatus_userId_name_key" ON "CustomStatus"("userId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
