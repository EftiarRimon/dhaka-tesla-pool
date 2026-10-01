"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "PASSENGER") router.replace("/passenger");
  }, [loading, user, router]);

  if (loading || !user || user.role === "PASSENGER") {
    return (
      <main>
        <p className="muted">Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Dhaka Tesla Pool</h1>
      <div className="card">
        <p>
          Signed in as <strong>{user.name}</strong> ({user.role}). The driver screen is next.
        </p>
        <button className="secondary" onClick={logout}>
          Sign out
        </button>
      </div>
    </main>
  );
}