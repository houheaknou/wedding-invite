-- Review L-8: currency columns hold only the two currencies the app supports.
-- (Prisma does not model CHECK constraints; it leaves them alone in later migrations.)
-- Fails, and changes nothing, if a row already holds another value.
ALTER TABLE "Event" ADD CONSTRAINT "Event_currency_check" CHECK ("currency" IN ('USD', 'KHR'));
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_currency_check" CHECK ("currency" IN ('USD', 'KHR'));
