-- CreateEnum
CREATE TYPE "PortalJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "portalUserName" TEXT;

-- CreateTable
CREATE TABLE "PortalAssignmentJob" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portalUser" TEXT NOT NULL,
    "status" "PortalJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "screenshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PortalAssignmentJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PortalAssignmentJob" ADD CONSTRAINT "PortalAssignmentJob_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAssignmentJob" ADD CONSTRAINT "PortalAssignmentJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
