import type { ReactNode } from "react";

type HeroProps = {
  variant: "passenger" | "driver";
  title: string;
  bangla: string;
  name?: string;
  children?: ReactNode;
};

const BG = { passenger: "/art/passenger-traffic.webp", driver: "/art/driver-pullers.webp" };

// Passenger: the rickshaw-and-bus jam of Dhaka. Driver: rickshaw pullers, plus a card with a painted rickshaw.
export function Hero({ variant, title, bangla, name, children }: HeroProps) {
  return (
    <header className={`hero hero-${variant}`}>
      <img className="hero-bg" src={BG[variant]} alt="" />
      <div className="hero-shade" />
      <div className="hero-text">
        <h1>{title}</h1>
        <p className="bangla">{bangla}</p>
        {children}
      </div>
      {variant === "driver" && (
        <figure className="hero-card">
          <img src="/art/driver-rickshaw.webp" alt="A hand-painted Dhaka rickshaw" />
          {name && <figcaption>{name}</figcaption>}
        </figure>
      )}
    </header>
  );
}
