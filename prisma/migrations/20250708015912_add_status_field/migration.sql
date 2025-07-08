-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Complaint" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "complaint" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queueNumber" TEXT,
    "category" TEXT,
    "deviceType" TEXT,
    "noInternet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Menunggu'
);
INSERT INTO "new_Complaint" ("category", "company", "complaint", "createdAt", "deviceType", "id", "name", "noInternet", "phone", "queueNumber") SELECT "category", "company", "complaint", "createdAt", "deviceType", "id", "name", "noInternet", "phone", "queueNumber" FROM "Complaint";
DROP TABLE "Complaint";
ALTER TABLE "new_Complaint" RENAME TO "Complaint";
CREATE UNIQUE INDEX "Complaint_queueNumber_key" ON "Complaint"("queueNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
