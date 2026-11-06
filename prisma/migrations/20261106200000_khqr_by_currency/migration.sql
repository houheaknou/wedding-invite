-- Gift KHQR is per account currency (USD / KHR), not per side: rename in place so uploads are kept
-- (a QR uploaded as the groom's becomes the USD one, the bride's the riel one).
ALTER TYPE "PhotoKind" RENAME VALUE 'KHQR_GROOM' TO 'KHQR_USD';
ALTER TYPE "PhotoKind" RENAME VALUE 'KHQR_BRIDE' TO 'KHQR_KHR';
ALTER TABLE "Invitation" RENAME COLUMN "giftGroomBank" TO "giftUsdBank";
ALTER TABLE "Invitation" RENAME COLUMN "giftGroomName" TO "giftUsdName";
ALTER TABLE "Invitation" RENAME COLUMN "giftGroomAccount" TO "giftUsdAccount";
ALTER TABLE "Invitation" RENAME COLUMN "giftBrideBank" TO "giftKhrBank";
ALTER TABLE "Invitation" RENAME COLUMN "giftBrideName" TO "giftKhrName";
ALTER TABLE "Invitation" RENAME COLUMN "giftBrideAccount" TO "giftKhrAccount";
