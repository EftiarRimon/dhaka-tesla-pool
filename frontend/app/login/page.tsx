"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/Art";
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
      <Hero variant="login" title="Dhaka Tesla Pool" bangla="সিট শেয়ার করুন, ভাড়া ভাগ করুন" name="Dhaka">
        <ul className="chips">
          <li>Share a seat</li>
          <li>Split the fare</li>
          <li>Beat the jam</li>
        </ul>
      </Hero>

      <form className="card" onSubmit={onSubmit}>
        <h2>Welcome back</h2>
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
        <p className="muted">
          New passenger? <Link href="/signup">Create an account</Link>
        </p>
      </form>

      <div className="card">
        <h2>Try the Banani story</h2>
        <p className="muted">Demo accounts, password: password123</p>
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
