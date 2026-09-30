export const BASE_FARE_PAISA = 4000;
export const RATE_PER_KM_PAISA = 1500;
export const POOL_DISCOUNT_PERCENT = 20;

export function soloFare(distanceKm: number, seats: number) {
  const perSeatSubtotalPaisa = BASE_FARE_PAISA + distanceKm * RATE_PER_KM_PAISA;
  const subtotalPaisa = perSeatSubtotalPaisa * seats;
  return { perSeatSubtotalPaisa, subtotalPaisa };
}

// Integer math only, so hand calculations and tests stay exact.
export function poolDiscountPaisa(subtotalPaisa: number): number {
  return Math.floor((subtotalPaisa * POOL_DISCOUNT_PERCENT) / 100);
}