-- Expenses tab: per-event budget/currency and a list of costs (with deposits paid so far).
ALTER TABLE "Event" ADD COLUMN "budget" DECIMAL(14,2);
ALTER TABLE "Event" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

CREATE TYPE "ExpenseCategory" AS ENUM ('VENUE', 'FOOD', 'DECOR', 'ATTIRE', 'PHOTO', 'MUSIC', 'INVITATION', 'CEREMONY', 'TRANSPORT', 'OTHER');

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "vendor" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dueDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Expense_eventId_idx" ON "Expense"("eventId");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
