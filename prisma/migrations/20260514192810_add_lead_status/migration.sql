-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED_WON', 'CLOSED_LOST');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'NEW';
