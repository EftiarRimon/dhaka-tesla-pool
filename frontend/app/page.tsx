"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else router.replace(user.role === "PASSENGER" ? "/passenger" : "/driver");
  }, [loading, user, router]);

  return (
    <main>
      <p className="muted">Loading...</p>
    </main>
  );
}