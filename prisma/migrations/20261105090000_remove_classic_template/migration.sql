-- The "Classic gold" template was removed; anything still on it moves to Royal gold.
UPDATE "Invitation" SET "template" = 'royal' WHERE "template" = 'classic';

-- AlterTable
ALTER TABLE "Invitation" ALTER COLUMN "template" SET DEFAULT 'royal';
