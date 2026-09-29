BEGIN;

-- Cast from docs/01-assumptions-and-lifecycle.md (password for all: password123)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Jashim', 'jashim@example.com', crypt('password123', gen_salt('bf')), 'DRIVER'),
  ('Nusrat', 'nusrat@example.com', crypt('password123', gen_salt('bf')), 'PASSENGER'),
  ('Rafiq',  'rafiq@example.com',  crypt('password123', gen_salt('bf')), 'PASSENGER'),
  ('Shirin', 'shirin@example.com', crypt('password123', gen_salt('bf')), 'PASSENGER');

-- Jashim owns Bullet, 3 seats
INSERT INTO vehicles (driver_id, name, capacity, is_online)
SELECT id, 'Bullet', 3, true FROM users WHERE email = 'jashim@example.com';

-- Zones and corridors
INSERT INTO zones (name, corridor) VALUES
  ('Banani',      'EAST'),
  ('Mohakhali',   'EAST'),
  ('Gulshan 1',   'EAST'),
  ('Gulshan 2',   'EAST'),
  ('Bashundhara', 'EAST'),
  ('Uttara',      'NORTH'),
  ('Mirpur',      'NORTH'),
  ('Dhanmondi',   'CENTRAL'),
  ('Farmgate',    'CENTRAL');

-- Distances from Banani (km, from docs/02-fare-model.md), stored both ways.
-- NORTH and CENTRAL distances are not documented yet.
WITH d(zone_name, km) AS (
  VALUES ('Mohakhali', 2), ('Gulshan 1', 3), ('Gulshan 2', 4), ('Bashundhara', 7)
),
pairs AS (
  SELECT b.id AS f, z.id AS t, d.km
  FROM d
  JOIN zones z ON z.name = d.zone_name
  JOIN zones b ON b.name = 'Banani'
)
INSERT INTO zone_distances (from_zone_id, to_zone_id, distance_km)
SELECT f, t, km FROM pairs
UNION ALL
SELECT t, f, km FROM pairs;

COMMIT;