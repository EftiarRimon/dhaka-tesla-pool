"use client";

import { useEffect } from "react";

const COLORS = ["#e9a820", "#c8242f", "#0b7a4b", "#1fb5b0", "#e49bb8"];

function spawn(cls: string, x: number, y: number, text = "", vars: Record<string, string> = {}) {
  const el = document.createElement("span");
  el.className = `fx ${cls}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

function burst(x: number, y: number, glyphs: string[], n: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 100;
    spawn("fx-burst", x, y, glyphs[i % glyphs.length], {
      "--dx": `${Math.cos(a) * d}px`,
      "--dy": `${Math.sin(a) * d - 50}px`,
      "--r": `${Math.random() * 540 - 270}deg`,
      color: COLORS[i % COLORS.length],
    });
  }
}

// Each important action gets its own little show. Matched on the button label.
function effect(label: string, x: number, y: number) {
  const t = label.toLowerCase();
  if (t.includes("request ride") || t.includes("start") || t.includes("sign in")) {
    spawn("fx-drive", 0, y, "🛺");
    burst(x, y, ["•", "·"], 8);
  } else if (t.includes("accept")) burst(x, y, ["৳", "৳", "✦"], 18);
  else if (t.includes("complete") || t.includes("drop")) burst(x, y, ["🎉", "★", "✦", "•"], 24);
  else if (t.includes("go online")) {
    spawn("fx-ring", x, y);
    window.setTimeout(() => spawn("fx-ring", x, y), 180);
  } else if (t.includes("cancel")) document.querySelector(".card")?.classList.add("shake");
  else spawn("fx-ring", x, y);
}

export default function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;

    // Cursor trail on a single canvas, only drawing while there is something to draw.
    const canvas = document.createElement("canvas");
    canvas.className = "trail";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    const dots: { x: number; y: number; life: number; c: string }[] = [];
    let raf = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i];
        d.life -= 0.035;
        if (d.life <= 0) {
          dots.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = d.life;
        ctx.fillStyle = d.c;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2 + d.life * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = dots.length ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      root.style.setProperty("--px", String(e.clientX / window.innerWidth - 0.5));
      root.style.setProperty("--py", String(e.clientY / window.innerHeight - 0.5));
      if (e.pointerType !== "mouse") return;
      dots.push({ x: e.clientX, y: e.clientY, life: 1, c: COLORS[Math.floor(Math.random() * COLORS.length)] });
      if (!raf) raf = requestAnimationFrame(draw);
      const card = (e.target as HTMLElement).closest<HTMLElement>(".card");
      if (card) {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--rx", `${(0.5 - py) * 4}deg`);
        card.style.setProperty("--ry", `${(px - 0.5) * 5}deg`);
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
      }
    };
    const onOut = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".card");
      if (card && !card.contains(e.relatedTarget as Node)) {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      }
    };
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (b && !b.disabled) effect(b.textContent ?? "", e.clientX, e.clientY);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("click", onClick);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
      canvas.remove();
    };
  }, []);

  return null;
}
