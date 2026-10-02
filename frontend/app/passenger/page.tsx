"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { errorMessage, STATUS_LABEL, taka } from "@/lib/format";
import {
  ACTIVE_STATUSES,
  CANCELLABLE_STATUSES,
  cancelRide,
  estimateRide,
  Estimate,
  listMyRides,
  listZones,
  requestRide,
  Ride,
  Zone,
} from "@/lib/rides";

export default function PassengerPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [seats, setSeats] = useState(1);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isPassenger = user?.role === "PASSENGER";

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isPassenger) router.replace("/");
  }, [loading, user, isPassenger, router]);

  const refresh = useCallback(async () => {
    try {
      setRides(await listMyRides());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  // Status updates arrive by polling every 5 seconds (see the README trade-offs).
  useEffect(() => {
    if (!isPassenger) return;
    listZones().then(setZones).catch((err) => setError(errorMessage(err)));
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [isPassenger, refresh]);

  useEffect(() => {
    setEstimate(null);
    setEstimateError(null);
    if (!pickup || !destination || pickup === destination) return;
    let stale = false;
    estimateRide({ pickupZoneId: Number(pickup), destinationZoneId: Number(destination), seats })
      .then((e) => !stale && setEstimate(e))
      .catch((err) => !stale && setEstimateError(errorMessage(err)));
    return () => {
      stale = true;
    };
  }, [pickup, destination, seats]);

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestRide({ pickupZoneId: Number(pickup), destinationZoneId: Number(destination), seats });
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(id: string) {
    setBusy(true);
    setError(null);
    try {
      await cancelRide(id);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !isPassenger) {
    return (
      <main>
        <p className="muted">Loading...</p>
      </main>
    );
  }

  const zoneName = (id: number) => zones.find((z) => z.id === id)?.name ?? `Zone ${id}`;
  const active = rides?.find((r) => ACTIVE_STATUSES.includes(r.status));
  const history = rides?.filter((r) => r !== active) ?? [];

  return (
    <main>
      <h1>Hello, {user?.name}</h1>
      <p className="tagline">Share a seat. Split the fare. Survive Dhaka traffic.</p>
      {error && <p className="error">{error}</p>}

      {rides === null ? (
        <p className="muted">Loading your rides...</p>
      ) : active ? (
        <section className="card">
          <h2>Your current ride</h2>
          <p>
            {zoneName(active.pickupZoneId)} to {zoneName(active.destinationZoneId)}, {active.seats} seat
            {active.seats > 1 ? "s" : ""}
          </p>
          <p>
            <span className="badge">{STATUS_LABEL[active.status]}</span>
          </p>
          <p className="fare">{taka(active.passengerFarePaisa)}</p>
          {active.discountPaisa > 0 && (
            <p className="muted">
              Shared ride: {taka(active.estimatedFarePaisa)} minus {taka(active.discountPaisa)} pool discount
            </p>
          )}
          {CANCELLABLE_STATUSES.includes(active.status) && (
            <button className="secondary" disabled={busy} onClick={() => onCancel(active.id)}>
              Cancel ride
            </button>
          )}
        </section>
      ) : (
        <form className="card" onSubmit={onRequest}>
          <h2>Request a ride</h2>
          <label>
            Pickup
            <select value={pickup} onChange={(e) => setPickup(e.target.value)} required>
              <option value="">Choose a zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Destination
            <select value={destination} onChange={(e) => setDestination(e.target.value)} required>
              <option value="">Choose a zone</option>
              {zones
                .filter((z) => String(z.id) !== pickup)
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Seats
            <select value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {estimate && (
            <p>
              Estimated fare: <span className="fare">{taka(estimate.estimatedFarePaisa)}</span>
              <span className="muted"> ({estimate.distanceKm} km, less if you share)</span>
            </p>
          )}
          {estimateError && <p className="error">{estimateError}</p>}
          <button type="submit" disabled={busy || !estimate}>
            {busy ? "Requesting..." : "Request ride"}
          </button>
        </form>
      )}

      <section className="card">
        <h2>Ride history</h2>
        {rides !== null && history.length === 0 && <p className="muted">No past rides yet.</p>}
        {history.map((r) => (
          <p key={r.id} className="history-row">
            {zoneName(r.pickupZoneId)} to {zoneName(r.destinationZoneId)}
            <span className="badge">{STATUS_LABEL[r.status]}</span>
            {r.status === "COMPLETED" && <strong> {taka(r.finalFarePaisa ?? r.passengerFarePaisa)}</strong>}
          </p>
        ))}
      </section>

      <button className="secondary" onClick={logout}>
        Sign out
      </button>
    </main>
  );
}