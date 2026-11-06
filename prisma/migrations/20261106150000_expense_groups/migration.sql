-- Expenses like the couple's budget sheet: grouped tables of quantity × unit price.
ALTER TABLE "Expense" ADD COLUMN "group" TEXT;
ALTER TABLE "Expense" ADD COLUMN "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1;
ALTER TABLE "Expense" ADD COLUMN "unitPrice" DECIMAL(14,2);
ALTER TABLE "Expense" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
UPDATE "Expense" SET "unitPrice" = "amount";
