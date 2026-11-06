-- Falling petals now uses light-gold headline lettering with a dark outline (over the cover photo).
-- Move invitations still on the old petal defaults; customised colors are left alone.
UPDATE "Invitation"
SET "titleTop" = '#FFE9A8', "titleBottom" = '#C98A2E', "titleOutline" = '#5A3A12'
WHERE "template" = 'petal'
  AND upper("titleTop") = '#B8862F' AND upper("titleBottom") = '#7A5418' AND upper("titleOutline") = '#FFF8E8';
