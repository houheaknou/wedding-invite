-- The "Blossom" template was removed; anything still on it moves to Royal gold.
UPDATE "Invitation" SET "template" = 'royal' WHERE "template" = 'blossom';
