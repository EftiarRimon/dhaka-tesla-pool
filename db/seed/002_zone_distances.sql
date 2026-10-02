BEGIN;

-- Remaining zone pairs, in km. Banani to Mohakhali, Gulshan 1, Gulshan 2 and
-- Bashundhara live in 001_seed.sql. These are rounded, invented numbers: the MVP
-- does no real routing (see docs/02-fare-model.md). Each pair is stored both ways.
WITH d(a, b, km) AS (
  VALUES
    ('Banani',      'Uttara',      12),
    ('Banani',      'Mirpur',       9),
    ('Banani',      'Dhanmondi',    8),
    ('Banani',      'Farmgate',     5),
    ('Mohakhali',   'Gulshan 1',    3),
    ('Mohakhali',   'Gulshan 2',    4),
    ('Mohakhali',   'Bashundhara',  6),
    ('Mohakhali',   'Uttara',      11),
    ('Mohakhali',   'Mirpur',       8),
    ('Mohakhali',   'Dhanmondi',    6),
    ('Mohakhali',   'Farmgate',     3),
    ('Gulshan 1',   'Gulshan 2',    2),
    ('Gulshan 1',   'Bashundhara',  5),
    ('Gulshan 1',   'Uttara',      10),
    ('Gulshan 1',   'Mirpur',      10),
    ('Gulshan 1',   'Dhanmondi',    7),
    ('Gulshan 1',   'Farmgate',     5),
    ('Gulshan 2',   'Bashundhara',  4),
    ('Gulshan 2',   'Uttara',       9),
    ('Gulshan 2',   'Mirpur',      11),
    ('Gulshan 2',   'Dhanmondi',    9),
    ('Gulshan 2',   'Farmgate',     6),
    ('Bashundhara', 'Uttara',       7),
    ('Bashundhara', 'Mirpur',      13),
    ('Bashundhara', 'Dhanmondi',   12),
    ('Bashundhara', 'Farmgate',     9),
    ('Uttara',      'Mirpur',       8),
    ('Uttara',      'Dhanmondi',   16),
    ('Uttara',      'Farmgate',    14),
    ('Mirpur',      'Dhanmondi',    6),
    ('Mirpur',      'Farmgate',     5),
    ('Dhanmondi',   'Farmgate',     3)
),
pairs AS (
  SELECT za.id AS f, zb.id AS t, d.km
  FROM d
  JOIN zones za ON za.name = d.a
  JOIN zones zb ON zb.name = d.b
)
INSERT INTO zone_distances (from_zone_id, to_zone_id, distance_km)
SELECT f, t, km FROM pairs
UNION ALL
SELECT t, f, km FROM pairs;

COMMIT;