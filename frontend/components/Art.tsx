import type { ReactNode } from "react";

type Variant = "login" | "passenger" | "driver";
type HeroProps = { variant: Variant; title: string; bangla: string; name?: string; children?: ReactNode };

// Every page uses this one banner, so login, passenger, driver and sign-up all share the same size and layout.
const ART: Record<Variant, { bg: string; card: string; alt: string }> = {
  login: { bg: "/art/login-city.webp", card: "/art/login-street.webp", alt: "A Dhaka lane with an auto-rickshaw, watercolour" },
  passenger: { bg: "/art/passenger-traffic.webp", card: "/art/login-rickshaw.webp", alt: "A hand-painted Dhaka rickshaw" },
  driver: { bg: "/art/driver-pullers.webp", card: "/art/driver-rickshaw.webp", alt: "A hand-painted Dhaka rickshaw" },
};

export function Hero({ variant, title, bangla, name, children }: HeroProps) {
  const a = ART[variant];
  return (
    <header className={`hero hero-${variant}`}>
      <img className="hero-bg" src={a.bg} alt="" />
      <div className="hero-shade" />
      <div className="hero-text">
        <h1>{title}</h1>
        <p className="bangla">{bangla}</p>
        {children}
      </div>
      <figure className="hero-card">
        <img src={a.card} alt={a.alt} />
        {name && <figcaption>{name}</figcaption>}
      </figure>
    </header>
  );
}
