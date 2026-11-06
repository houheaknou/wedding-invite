-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('GROOM', 'BRIDE', 'VENUE');

-- CreateEnum
CREATE TYPE "RsvpAnswer" AS ENUM ('YES', 'NO', 'MAYBE');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "brideNameEn" TEXT,
ADD COLUMN     "brideParents" TEXT,
ADD COLUMN     "brideParentsEn" TEXT,
ADD COLUMN     "groomNameEn" TEXT,
ADD COLUMN     "groomParents" TEXT,
ADD COLUMN     "groomParentsEn" TEXT,
ADD COLUMN     "venueEn" TEXT;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "background" TEXT NOT NULL DEFAULT 'paper',
ADD COLUMN     "showMap" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showParents" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showRsvp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "themeColor" TEXT NOT NULL DEFAULT '#B8862F',
ADD COLUMN     "titleEn" TEXT;

-- CreateTable
CREATE TABLE "EventPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "PhotoKind" NOT NULL,
    "data" BYTEA NOT NULL,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "answer" "RsvpAnswer" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventPhoto_eventId_kind_key" ON "EventPhoto"("eventId", "kind");

-- CreateIndex
CREATE INDEX "Rsvp_eventId_idx" ON "Rsvp"("eventId");

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
