import { api } from "./api";
import { Ride, RideStatus } from "./rides";

export interface Vehicle {
  id: string;
  name: string;
  capacity: number;
  isOnline: boolean;
}

export interface PoolPassenger {
  rideId: string;
  name: string;
  seats: number;
  status: RideStatus;
  destinationZone: string;
  passengerFarePaisa: number;
  finalFarePaisa: number | null;
}

export interface Pool {
  id: string;
  status: "OPEN" | "IN_PROGRESS";
  pickupZone: string;
  capacity: number;
  occupiedSeats: number;
  freeSeats: number;
  passengers: PoolPassenger[];
}

export interface HistoryItem extends PoolPassenger {
  poolId: string;
  pickupZone: string;
  finishedAt: string;
}

export type DriverAction = "arrive" | "start" | "complete";

// The one button a driver can press for a passenger in each status.
export const NEXT_ACTION: Partial<Record<RideStatus, { action: DriverAction; label: string }>> = {
  MATCHED: { action: "arrive", label: "Mark arrived" },
  DRIVER_ARRIVED: { action: "start", label: "Start trip" },
  STARTED: { action: "complete", label: "Complete trip" },
};

export const getVehicle = () => api<Vehicle>("/vehicles/me");
export const setOnline = (online: boolean) =>
  api<Vehicle>("/vehicles/me/status", { method: "PATCH", body: { online } });
export const getPool = () => api<{ pool: Pool | null }>("/vehicles/me/pool");
export const getHistory = () => api<HistoryItem[]>("/vehicles/me/history");
export const listAvailable = () => api<Ride[]>("/rides/available");
export const acceptRide = (id: string) => api<Ride>(`/rides/${id}/accept`, { method: "POST" });
export const advanceRide = (id: string, action: DriverAction) =>
  api<Ride>(`/rides/${id}/${action}`, { method: "POST" });