-- Attempt counters for login, sign-up and RSVP rate limiting. New table only; no existing data touched.
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
