/*
  Warnings:

  - Added the required column `ip` to the `refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userAgent` to the `refresh_token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "refresh_token" ADD COLUMN     "ip" TEXT NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "userAgent" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "refresh_token_userId_jwtId_idx" ON "refresh_token"("userId", "jwtId");
