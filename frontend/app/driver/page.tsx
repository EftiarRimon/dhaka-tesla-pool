"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { errorMessage, taka } from "@/lib/format";
import { listZones, Ride, Zone } from "@/lib/rides";
import { Hero } from "@/components/Art";
import {
  acceptRide,
  advanceRide,
  getHistory,
  getPool,
  getVehicle,
  HistoryItem,
  listAvailable,
  NEXT_ACTION,
  Pool,
  setOnline,
  Vehicle,
} from "@/lib/driver";

// The driver sees the trip from the other side, so the wording differs from the passenger page.
const DRIVER_LABEL: Record<string, string> = {
  MATCHED: "Waiting for pickup",
  DRIVER_ARRIVED: "At pickup",
  STARTED: "On trip",
  COMPLETED: "Dropped off",
  CANCELLED: "Cancelled",
};

export default function DriverPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [available, setAvailable] = useState<Ride[] | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isDriver = user?.role === "DRIVER";

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isDriver) router.replace("/");
  }, [loading, user, isDriver, router]);

  const refresh = useCallback(async () => {
    try {
      const [v, p, a, h] = await Promise.all([
        getVehicle(),
        getPool(),
        listAvailable(),
        getHistory(),
      ]);
      setVehicle(v);
      setPool(p.pool);
      setAvailable(a);
      setHistory(h);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  // New requests and passenger changes arrive by polling every 5 seconds (see the README trade-offs).
  useEffect(() => {
    if (!isDriver) return;
    listZones()
      .then(setZones)
      .catch((err) => setError(errorMessage(err)));
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [isDriver, refresh]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading || !isDriver) {
    return (
      <main>
        <p className="muted">Loading...</p>
      </main>
    );
  }

  const zoneName = (id: number) =>
    zones.find((z) => z.id === id)?.name ?? `Zone ${id}`;
  const online = vehicle?.isOnline ?? false;

  return (
    <main>
      <Hero
        variant="driver"
        title="Bullet"
        name="Bullet"
        bangla="আপনার রিকশা, আপনার যাত্রী"
      />
      <p className="tagline">Fill the seats, split the fare, beat the jam.</p>
      {loadError && <p className="error">{loadError}</p>}
      {error && <p className="error">{error}</p>}

      {vehicle === null ? (
        !loadError && <p className="muted">Loading your vehicle...</p>
      ) : (
        <section className="card">
          <div className="topbar">
            <div>
              <h2>{vehicle.name}</h2>
              <span className="muted">{vehicle.capacity} seats</span>
              <span className={online ? "badge" : "badge off"}>
                {online ? "Online" : "Offline"}
              </span>
            </div>
            <button
              className={online ? "secondary" : undefined}
              disabled={busy}
              onClick={() => run(() => setOnline(!online))}
            >
              {online ? "Go offline" : "Go online"}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Current pool</h2>
        {vehicle === null ? (
          <p className="muted">Loading...</p>
        ) : pool === null ? (
          <p className="muted">
            No active pool. Accept a request below to start one.
          </p>
        ) : (
          <>
            <p>
              Pickup: <strong>{pool.pickupZone}</strong>
              <span className="badge">
                {pool.status === "OPEN"
                  ? "Open for passengers"
                  : "Trip in progress"}
              </span>
            </p>
            <div
              className="seats"
              aria-label={`${pool.occupiedSeats} of ${pool.capacity} seats taken`}
            >
              {Array.from({ length: pool.capacity }, (_, i) => (
                <span
                  key={i}
                  className={i < pool.occupiedSeats ? "seat filled" : "seat"}
                />
              ))}
            </div>
            <p className="muted">
              {pool.occupiedSeats} of {pool.capacity} seats taken,{" "}
              {pool.freeSeats} free
            </p>
            {pool.passengers.map((p) => {
              const next = NEXT_ACTION[p.status];
              return (
                <div key={p.rideId} className="passenger">
                  <div>
                    <strong>{p.name}</strong> ({p.seats} seat
                    {p.seats > 1 ? "s" : ""}) to {p.destinationZone}
                    <span className="badge">
                      {DRIVER_LABEL[p.status] ?? p.status}
                    </span>
                    <div className="muted">
                      Fare{" "}
                      {taka(
                        p.status === "COMPLETED"
                          ? (p.finalFarePaisa ?? p.passengerFarePaisa)
                          : p.passengerFarePaisa,
                      )}
                    </div>
                  </div>
                  {next && (
                    <button
                      className="small"
                      disabled={busy}
                      onClick={() =>
                        run(() => advanceRide(p.rideId, next.action))
                      }
                    >
                      {next.label}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>

      <section className="card">
        <h2>Ride requests</h2>
        {!online && vehicle !== null && (
          <p className="muted">Go online to accept requests.</p>
        )}
        {available === null ? (
          <p className="muted">Loading requests...</p>
        ) : available.length === 0 ? (
          <p className="muted">
            No requests right now. This list refreshes every few seconds.
          </p>
        ) : (
          available.map((r) => (
            <div key={r.id} className="passenger">
              <div>
                {zoneName(r.pickupZoneId)} to {zoneName(r.destinationZoneId)}
                <div className="muted">
                  {r.seats} seat{r.seats > 1 ? "s" : ""}, solo fare{" "}
                  {taka(r.estimatedFarePaisa)}
                </div>
              </div>
              <button
                className="small"
                disabled={busy || !online}
                onClick={() => run(() => acceptRide(r.id))}
              >
                Accept
              </button>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Trip history</h2>
        {history === null ? (
          <p className="muted">Loading...</p>
        ) : history.length === 0 ? (
          <p className="muted">No finished trips yet.</p>
        ) : (
          history.map((h) => (
            <p key={h.rideId} className="history-row">
              {h.name}: {h.pickupZone} to {h.destinationZone}
              <span className="badge">
                {DRIVER_LABEL[h.status] ?? h.status}
              </span>
              {h.status === "COMPLETED" && (
                <strong>
                  {" "}
                  {taka(h.finalFarePaisa ?? h.passengerFarePaisa)}
                </strong>
              )}
              <span className="muted">
                {" "}
                {new Date(h.finishedAt).toLocaleString()}
              </span>
            </p>
          ))
        )}
      </section>

      <button className="secondary" onClick={logout}>
        Sign out
      </button>
    </main>
  );
}
