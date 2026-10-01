"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
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
          Signed in as <strong>{user.name}</strong> ({user.role})
        </p>
        <button className="secondary" onClick={logout}>
          Sign out
        </button>
      </div>
    </main>
  );
}