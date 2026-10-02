"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const DEMO = [
  { name: "Nusrat", email: "nusrat@example.com", role: "Passenger" },
  { name: "Rafiq", email: "rafiq@example.com", role: "Passenger" },
  { name: "Shirin", email: "shirin@example.com", role: "Passenger" },
  { name: "Jashim", email: "jashim@example.com", role: "Driver" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Dhaka Tesla Pool</h1>
      <p className="tagline">Share a seat. Split the fare. Survive Dhaka traffic.</p>

      <form className="card" onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="muted">
        New passenger? <Link href="/signup">Create an account</Link>
      </p>

      <div className="card">
        <p className="muted">Demo accounts (password: password123)</p>
        <div className="row">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              className="secondary"
              onClick={() => {
                setEmail(d.email);
                setPassword("password123");
              }}
            >
              {d.name} ({d.role})
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}