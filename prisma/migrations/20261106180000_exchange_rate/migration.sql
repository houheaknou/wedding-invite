-- Dashboard finance: riel per dollar for comparing $/៛ gifts with expenses.
ALTER TABLE "Event" ADD COLUMN "exchangeRate" INTEGER NOT NULL DEFAULT 4000;
