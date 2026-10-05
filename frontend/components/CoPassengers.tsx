"use client";

import { useEffect, useState } from "react";
import { CoPassenger, listCoPassengers } from "@/lib/rides";

export default function CoPassengers({
  rideId,
  status,
  zoneName,
}: {
  rideId: string;
  status: string;
  zoneName: (id: number) => string;
}) {
  const [others, setOthers] = useState<CoPassenger[]>([]);

  // Another passenger can join later without this ride's status changing, so poll.
  useEffect(() => {
    let stale = false;
    const load = () =>
      listCoPassengers(rideId)
        .then((l) => !stale && setOthers(l))
        .catch(() => !stale && setOthers([]));
    load();
    const timer = setInterval(load, 5000);
    return () => {
      stale = true;
      clearInterval(timer);
    };
  }, [rideId, status]);

  if (others.length === 0) return null;

  return (
    <div className="copassengers">
      <h3>Sharing this ride with</h3>
      <ul>
        {others.map((p, i) => (
          <li key={i}>
            <strong>{p.firstName}</strong>
            <span className="muted">
              {" "}
              {zoneName(p.pickupZoneId)} to {zoneName(p.destinationZoneId)}, {p.seats} seat
              {p.seats > 1 ? "s" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}