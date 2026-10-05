import type { ReactNode } from "react";
import Motion from "@/components/Motion";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata = {
  title: "Dhaka Tesla Pool",
  description: "Share a seat. Split the fare. Survive Dhaka traffic.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Motion />
      </body>
    </html>
  );
}
