-- Invitation ចំណងដៃ section: bank KHQR images per side + account details.
ALTER TYPE "PhotoKind" ADD VALUE 'KHQR_GROOM';
ALTER TYPE "PhotoKind" ADD VALUE 'KHQR_BRIDE';
ALTER TABLE "Invitation" ADD COLUMN "showGiftQr" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Invitation" ADD COLUMN "giftGroomBank" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "giftGroomName" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "giftGroomAccount" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "giftBrideBank" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "giftBrideName" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "giftBrideAccount" TEXT;
