/*
  Warnings:

  - You are about to drop the column `frequency` on the `MedicationReminder` table. All the data in the column will be lost.
  - Added the required column `dosage` to the `MedicationReminder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequencyLabel` to the `MedicationReminder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `intervalHours` to the `MedicationReminder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remainingDoses` to the `MedicationReminder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MedicationReminder" DROP COLUMN "frequency",
ADD COLUMN     "dosage" TEXT NOT NULL,
ADD COLUMN     "frequencyLabel" TEXT NOT NULL,
ADD COLUMN     "intervalHours" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "remainingDoses" INTEGER NOT NULL;
