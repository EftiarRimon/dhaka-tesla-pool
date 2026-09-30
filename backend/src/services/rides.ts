import { HttpError } from "../errors";
import { soloFare } from "../fare";
import * as zones from "../repositories/zones";

export async function estimate(input: { pickupZoneId: number; destinationZoneId: number; seats: number }) {
  const { pickupZoneId, destinationZoneId, seats } = input;
  const found = await zones.countExisting([pickupZoneId, destinationZoneId]);
  if (found !== 2) {
    throw new HttpError(404, "Zone not found");
  }
  const distanceKm = await zones.findDistanceKm(pickupZoneId, destinationZoneId);
  if (distanceKm === null) {
    throw new HttpError(422, "No distance data for this zone pair");
  }
  const { perSeatSubtotalPaisa, subtotalPaisa } = soloFare(distanceKm, seats);
  return {
    pickupZoneId,
    destinationZoneId,
    seats,
    distanceKm,
    perSeatSubtotalPaisa,
    estimatedFarePaisa: subtotalPaisa,
  };
}