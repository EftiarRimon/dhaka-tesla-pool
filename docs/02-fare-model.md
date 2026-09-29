# Fare Model

## Formula

perSeatSubtotal = baseFare + (distanceKm x ratePerKm)
subtotal = perSeatSubtotal x seats
poolDiscount = 20% of subtotal, only when the pool has 2 or more passengers
passengerFare = subtotal - poolDiscount

## Constants

| Name | Value |
|---|---|
| baseFare | 4000 paisa (40 BDT) |
| ratePerKm | 1500 paisa (15 BDT) |
| poolDiscountPercent | 20 |

## Zone distances from Banani (km, simplified)

| Destination | km |
|---|---|
| Mohakhali | 2 |
| Gulshan 1 | 3 |

## Worked example (verify by hand)

Nusrat, Banani to Mohakhali, 1 seat:
- distance charge = 2 x 1500 = 3000
- subtotal = 4000 + 3000 = 7000
- discount = 20% of 7000 = 1400
- fare = 5600 paisa (56 BDT)

Rafiq, Banani to Gulshan 1, 1 seat:
- distance charge = 3 x 1500 = 4500
- subtotal = 4000 + 4500 = 8500
- discount = 20% of 8500 = 1700
- fare = 6800 paisa (68 BDT)

Solo estimate (no pool): Nusrat 7000, Rafiq 8500.

## Money storage

Integer paisa, stored as INTEGER in Postgres. Floats cannot represent values like 0.1 exactly, so sums would drift. Integers make the hand calculation and tests exact. The discount is computed with integer math: floor(subtotal x 20 / 100).

## When fares change

- Estimate: solo fare shown at request time.
- On match into a pool of 2 or more, the discount applies and each passenger fare is recalculated.
- The final fare is snapshotted on the ride at COMPLETED so history stays explainable even if constants change later.