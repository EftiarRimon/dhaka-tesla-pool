"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/Art";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Role = "PASSENGER" | "DRIVER";

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role>("PASSENGER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teslaName, setTeslaName] = useState("");
  const [capacity, setCapacity] = useState(3);
  const [created, setCreated] = useState(false); // the account exists, only the Tesla is left to save
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!created) {
        await api("/auth/register", { method: "POST", body: { name, email, password, role } });
        await login(email, password);
        setCreated(true);
      }
      if (role === "DRIVER") {
        await api("/vehicles", { method: "POST", body: { name: teslaName, capacity } });
      }
      router.replace("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(created || role === "DRIVER" ? `${msg}. If your account was created, press the button again to save your Tesla.` : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <Hero variant="login" title="Join Dhaka Tesla Pool" bangla="আমাদের সাথে যুক্ত হোন" name="Welcome">
        <ul className="chips">
          <li>Free to join</li>
          <li>Pay by cash</li>
          <li>Share and save</li>
        </ul>
      </Hero>

      <form className="card" onSubmit={onSubmit}>
        <h2>Create your account</h2>

        <div className="role-switch" role="group" aria-label="Account type">
          <button type="button" className={role === "PASSENGER" ? "active" : ""} disabled={created} onClick={() => setRole("PASSENGER")}>
            Passenger
            <small>Book shared rides</small>
          </button>
          <button type="button" className={role === "DRIVER" ? "active" : ""} disabled={created} onClick={() => setRole("DRIVER")}>
            Driver
            <small>I own a Tesla</small>
          </button>
        </div>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} disabled={created} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={created} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={72}
            disabled={created}
          />
          <span className="muted">At least 8 characters</span>
        </label>

        {role === "DRIVER" && (
          <>
            <label>
              Tesla name
              <input value={teslaName} onChange={(e) => setTeslaName(e.target.value)} placeholder="Bullet" required maxLength={100} />
            </label>
            <label>
              Seats for passengers
              <select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Saving..." : created ? "Save my Tesla" : "Create account"}
        </button>
        <p className="muted">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
