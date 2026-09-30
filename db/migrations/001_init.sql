CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('PASSENGER', 'DRIVER')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE zones (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  corridor TEXT NOT NULL CHECK (corridor IN ('EAST', 'NORTH', 'CENTRAL'))
);

CREATE TABLE zone_distances (
  from_zone_id INT NOT NULL REFERENCES zones(id),
  to_zone_id   INT NOT NULL REFERENCES zones(id),
  distance_km  INT NOT NULL CHECK (distance_km > 0),
  PRIMARY KEY (from_zone_id, to_zone_id)
);

CREATE TABLE vehicles (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL UNIQUE REFERENCES users(id),
  name      TEXT NOT NULL,
  capacity  INT NOT NULL CHECK (capacity BETWEEN 1 AND 6),
  is_online BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE pools (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id     UUID NOT NULL REFERENCES vehicles(id),
  pickup_zone_id INT NOT NULL REFERENCES zones(id),
  capacity       INT NOT NULL CHECK (capacity > 0),
  occupied_seats INT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'OPEN'
                 CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pools_seats_within_capacity
    CHECK (occupied_seats >= 0 AND occupied_seats <= capacity)
);

CREATE UNIQUE INDEX one_active_pool_per_vehicle
  ON pools (vehicle_id) WHERE status IN ('OPEN', 'IN_PROGRESS');

CREATE TABLE rides (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id         UUID NOT NULL REFERENCES users(id),
  pool_id              UUID REFERENCES pools(id),
  pickup_zone_id       INT NOT NULL REFERENCES zones(id),
  destination_zone_id  INT NOT NULL REFERENCES zones(id),
  seats                INT NOT NULL CHECK (seats BETWEEN 1 AND 6),
  status               TEXT NOT NULL DEFAULT 'REQUESTED'
                       CHECK (status IN ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED',
                                         'STARTED', 'COMPLETED', 'CANCELLED')),
  estimated_fare_paisa INT NOT NULL CHECK (estimated_fare_paisa >= 0),
  discount_paisa       INT NOT NULL DEFAULT 0 CHECK (discount_paisa >= 0),
  final_fare_paisa     INT CHECK (final_fare_paisa >= 0),
  payment_method       TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (pickup_zone_id <> destination_zone_id),
  CHECK (status IN ('REQUESTED', 'CANCELLED') OR pool_id IS NOT NULL)
);

CREATE UNIQUE INDEX one_active_ride_per_passenger
  ON rides (passenger_id)
  WHERE status IN ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED');

CREATE INDEX rides_pool_idx ON rides (pool_id);
CREATE INDEX rides_passenger_history_idx ON rides (passenger_id, created_at DESC);

CREATE TABLE ride_events (
  id          BIGSERIAL PRIMARY KEY,
  ride_id     UUID NOT NULL REFERENCES rides(id),
  from_status TEXT,
  to_status   TEXT NOT NULL,
  actor_id    UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ride_events_ride_idx ON ride_events (ride_id);