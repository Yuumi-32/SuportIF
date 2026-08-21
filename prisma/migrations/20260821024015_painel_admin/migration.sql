-- CreateEnum
CREATE TYPE "ClassLevel" AS ENUM ('TECHNICAL', 'HIGHER');

-- CreateEnum
CREATE TYPE "ModuleApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ClassGroup" ADD COLUMN     "course" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "level" "ClassLevel" NOT NULL DEFAULT 'TECHNICAL',
ADD COLUMN     "term" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "approvalStatus" "ModuleApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InstitutionSettings" (
    "id" TEXT NOT NULL DEFAULT 'institution',
    "name" TEXT NOT NULL DEFAULT 'Instituto Federal — Campus Demonstrativo',
    "emailDomain" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT 'violeta',
    "openRegistration" BOOLEAN NOT NULL DEFAULT true,
    "requireInstitutionalEmail" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Module_approvalStatus_idx" ON "Module"("approvalStatus");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Conteúdo que já existia continua publicado: a fila de aprovação só vale para
-- o que for criado a partir de agora.
UPDATE "Module" SET "approvalStatus" = 'APPROVED', "reviewedAt" = CURRENT_TIMESTAMP;
