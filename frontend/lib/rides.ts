import { api } from "./api";

export type RideStatus = "REQUESTED" | "MATCHED" | "DRIVER_ARRIVED" | "STARTED" | "COMPLETED" | "CANCELLED";

export interface Zone {
  id: number;
  name: string;
  corridor: string;
}

export interface Ride {
  id: string;
  status: RideStatus;
  poolId: string | null;
  pickupZoneId: number;
  destinationZoneId: number;
  seats: number;
  estimatedFarePaisa: number;
  discountPaisa: number;
  passengerFarePaisa: number;
  finalFarePaisa: number | null;
}

export interface Estimate {
  distanceKm: number;
  estimatedFarePaisa: number;
}

export interface RideInput {
  pickupZoneId: number;
  destinationZoneId: number;
  seats: number;
}

export const ACTIVE_STATUSES: RideStatus[] = ["REQUESTED", "MATCHED", "DRIVER_ARRIVED", "STARTED"];
export const CANCELLABLE_STATUSES: RideStatus[] = ["REQUESTED", "MATCHED", "DRIVER_ARRIVED"];

export const listZones = () => api<Zone[]>("/zones");
export const listMyRides = () => api<Ride[]>("/rides/me");
export const estimateRide = (input: RideInput) => api<Estimate>("/rides/estimate", { method: "POST", body: input });
export const requestRide = (input: RideInput) => api<Ride>("/rides", { method: "POST", body: input });
export const cancelRide = (id: string) => api<Ride>(`/rides/${id}/cancel`, { method: "POST" });

export interface RideEvent {
  id: string;
  fromStatus: RideStatus | null;
  toStatus: RideStatus;
  actorRole: "PASSENGER" | "DRIVER";
  createdAt: string;
}

export const listRideEvents = (id: string) => api<RideEvent[]>(`/rides/${id}/events`);

export interface CoPassenger {
  firstName: string;
  pickupZoneId: number;
  destinationZoneId: number;
  seats: number;
  matchedAt: string | null;
}

export const listCoPassengers = (id: string) => api<CoPassenger[]>(`/rides/${id}/copassengers`);