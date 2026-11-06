-- AlterEnum
ALTER TYPE "PhotoKind" ADD VALUE 'BACKGROUND';

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "fontStyle" TEXT NOT NULL DEFAULT 'serif',
ALTER COLUMN "background" SET DEFAULT 'temple';

-- old background values map onto the new default
UPDATE "Invitation" SET "background" = 'temple' WHERE "background" IN ('paper', 'lattice', 'plain');
