-- Gifts tab (ចំណងដៃ): money received from guests, in $ or ៛ per gift.
CREATE TYPE "GiftMethod" AS ENUM ('CASH', 'BANK', 'OTHER');

CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "side" "GuestSide" NOT NULL DEFAULT 'BOTH',
    "method" "GiftMethod" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Gift_eventId_idx" ON "Gift"("eventId");
CREATE INDEX "Gift_guestId_idx" ON "Gift"("guestId");
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
