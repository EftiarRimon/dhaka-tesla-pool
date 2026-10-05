"use client";

import { useEffect, useState } from "react";
import { STATUS_LABEL } from "@/lib/format";
import { listRideEvents, RideEvent } from "@/lib/rides";

// Always show Dhaka time, whatever the browser's timezone is.
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Dhaka",
});

export default function RideTimeline({ rideId, status }: { rideId: string; status: string }) {
  const [events, setEvents] = useState<RideEvent[] | null>(null);

  // Refetch whenever the ride status changes (the page already polls every 5 seconds).
  useEffect(() => {
    let stale = false;
    listRideEvents(rideId)
      .then((e) => !stale && setEvents(e))
      .catch(() => !stale && setEvents([]));
    return () => {
      stale = true;
    };
  }, [rideId, status]);

  if (!events || events.length === 0) return null;

  return (
    <div className="timeline">
      <h3>Ride timeline</h3>
      <ol>
        {events.map((e) => (
          <li key={e.id}>
            <strong>{STATUS_LABEL[e.toStatus] ?? e.toStatus}</strong>
            <span className="muted"> {timeFormat.format(new Date(e.createdAt))}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}