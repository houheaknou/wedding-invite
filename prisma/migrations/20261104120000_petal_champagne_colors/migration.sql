-- Falling petals headline gold becomes a warmer, pinkish champagne.
-- Move invitations still on an earlier petal default (original or 2026-11-04); customised colors are left alone.
UPDATE "Invitation"
SET "titleTop" = '#FFEBD6', "titleBottom" = '#D9A26E', "titleOutline" = '#6B3A22'
WHERE "template" = 'petal'
  AND (
    (upper("titleTop") = '#B8862F' AND upper("titleBottom") = '#7A5418' AND upper("titleOutline") = '#FFF8E8')
    OR (upper("titleTop") = '#FFE9A8' AND upper("titleBottom") = '#C98A2E' AND upper("titleOutline") = '#5A3A12')
  );
