# Assumptions, Lifecycle and Matching Rule

## Cast (used in seed data, tests, demo)

| Role | Name | Notes |
|---|---|---|
| Driver | Jashim | Owns Bullet, 3 seats |
| Passenger | Nusrat | Banani to Mohakhali, 1 seat |
| Passenger | Rafiq | Banani to Gulshan 1, 1 seat |
| Passenger | Shirin | Requests the last seat, used in the concurrency test |

## Assumptions

1. Geography is a fixed list of Dhaka zones. No real routing or map API.
2. A Tesla has a fixed capacity (Bullet = 3). A passenger request asks for 1 to 3 seats.
3. One driver owns exactly one Tesla in the MVP.
4. A driver can run only one active pool at a time.
5. Payment is cash only in the MVP. The fare is recorded, not collected online.
6. Money is stored as integer paisa. No floating point.
7. A passenger can have only one active ride at a time.
8. Cancel is allowed before the trip starts. After STARTED it is rejected.
9. A driver can accept a ride only while online and only if seats are free.

## Zones and corridors

Each zone belongs to a corridor. Two rides are compatible when they share the same pickup zone and their destinations are in the same corridor.

| Corridor | Zones |
|---|---|
| EAST | Banani, Mohakhali, Gulshan 1, Gulshan 2, Bashundhara |
| NORTH | Uttara, Mirpur |
| CENTRAL | Dhanmondi, Farmgate |

## Matching rule

A new request R can join an open pool P when all of these are true:

1. R.pickupZone equals the pool's pickup zone.
2. R.destinationZone is in the same corridor as the pool's first passenger destination.
3. P.status is OPEN (trip not yet started).
4. P.occupiedSeats + R.seats is at most the Tesla capacity.

Example: Nusrat (Banani to Mohakhali) and Rafiq (Banani to Gulshan 1) share the pickup zone and both destinations are in EAST, so they can share Bullet.

## Ride lifecycle (per passenger ride)

REQUESTED, MATCHED, DRIVER_ARRIVED, STARTED, COMPLETED, plus CANCELLED.

| From | To | Who |
|---|---|---|
| REQUESTED | MATCHED | driver accepts |
| MATCHED | DRIVER_ARRIVED | driver |
| DRIVER_ARRIVED | STARTED | driver |
| STARTED | COMPLETED | driver |
| REQUESTED, MATCHED, DRIVER_ARRIVED | CANCELLED | passenger (own ride) or driver |

Anything else is rejected with HTTP 409.

## Pool lifecycle

OPEN (accepting passengers), IN_PROGRESS (trip started), COMPLETED, CANCELLED.

Why the improvement: the brief suggests one lifecycle. We keep a status on each passenger ride AND on the pool, because one passenger can cancel while the others continue. Each passenger sees only their own ride status.


## Rules added during implementation

1. The first `start` moves the pool from OPEN to IN_PROGRESS. After that no new passenger can join.
2. The pool discount applies while two or more passengers are active. If a passenger cancels and only one is left while the pool is OPEN, the discount is removed. Once IN_PROGRESS, fares are frozen, so a late cancellation cannot change a fare mid-trip.
3. `complete` snapshots `final_fare_paisa = estimated_fare_paisa - discount_paisa`.
4. A pool becomes COMPLETED when its last active ride completes (or cancels while IN_PROGRESS), and CANCELLED when its last active ride cancels while OPEN.
5. Cancelling releases the ride's seats in the same transaction. Completing does not, so a finished pool still shows how many seats were used.
6. Lock order everywhere: vehicle, then ride, then pool. Cancel reads the ride's vehicle without a lock first, then re-checks the pool after locking the ride, and returns 409 if it changed.
7. Cancel is allowed from REQUESTED, MATCHED and DRIVER_ARRIVED. A passenger can cancel only their own ride, a driver only rides in their own pool. After STARTED, cancel returns 409.