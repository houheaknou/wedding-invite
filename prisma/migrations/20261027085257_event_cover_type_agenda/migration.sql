-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WEDDING', 'ENGAGEMENT', 'BIRTHDAY', 'OTHER');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "agenda" TEXT,
ADD COLUMN     "coverImage" BYTEA,
ADD COLUMN     "coverImageType" TEXT,
ADD COLUMN     "eventType" "EventType" NOT NULL DEFAULT 'WEDDING';
