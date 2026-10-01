// Money is integer paisa everywhere. Dividing by 100 happens only here, for display.
export function taka(paisa: number): string {
  return `৳${(paisa / 100).toFixed(2)}`;
}

export const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Waiting for a driver",
  MATCHED: "Driver matched",
  DRIVER_ARRIVED: "Driver has arrived",
  STARTED: "Trip in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}