/*
  Warnings:

  - A unique constraint covering the columns `[queueNumber]` on the table `Complaint` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN "queueNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_queueNumber_key" ON "Complaint"("queueNumber");
