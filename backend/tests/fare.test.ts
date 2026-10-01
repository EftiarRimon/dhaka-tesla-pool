import { describe, expect, it } from "vitest";
import { poolDiscountPaisa, soloFare } from "../src/fare";

describe("fare model, hand-checkable with Nusrat and Rafiq", () => {
  it("Nusrat, Banani to Mohakhali (2 km): 7000 solo, 1400 off, 5600 pooled", () => {
    const { subtotalPaisa } = soloFare(2, 1);
    expect(subtotalPaisa).toBe(4000 + 2 * 1500);
    expect(subtotalPaisa).toBe(7000);
    expect(poolDiscountPaisa(subtotalPaisa)).toBe(1400);
    expect(subtotalPaisa - poolDiscountPaisa(subtotalPaisa)).toBe(5600);
  });

  it("Rafiq, Banani to Gulshan 1 (3 km): 8500 solo, 1700 off, 6800 pooled", () => {
    const { subtotalPaisa } = soloFare(3, 1);
    expect(subtotalPaisa).toBe(8500);
    expect(poolDiscountPaisa(subtotalPaisa)).toBe(1700);
    expect(subtotalPaisa - poolDiscountPaisa(subtotalPaisa)).toBe(6800);
  });

  it("scales with seats: 2 seats for Nusrat's trip cost 14000 solo", () => {
    expect(soloFare(2, 2).subtotalPaisa).toBe(14000);
    expect(poolDiscountPaisa(14000)).toBe(2800);
  });

  it("uses integer math: the discount is floored, never fractional", () => {
    expect(poolDiscountPaisa(8501)).toBe(1700);
    expect(Number.isInteger(poolDiscountPaisa(8501))).toBe(true);
  });
});
