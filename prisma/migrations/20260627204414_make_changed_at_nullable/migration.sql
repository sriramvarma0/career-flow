-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedAt" DATETIME,
    CONSTRAINT "StatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StatusHistory" ("applicationId", "changedAt", "id", "newStatus", "previousStatus") SELECT "applicationId", "changedAt", "id", "newStatus", "previousStatus" FROM "StatusHistory";
DROP TABLE "StatusHistory";
ALTER TABLE "new_StatusHistory" RENAME TO "StatusHistory";
CREATE INDEX "StatusHistory_applicationId_idx" ON "StatusHistory"("applicationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
