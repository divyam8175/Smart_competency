import "../styles/globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import clsx from "clsx";

export const metadata: Metadata = {
  title: "Smart Competency Builder",
  description: "Dynamic competency graph and scorecard platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={clsx("bg-night text-slate-100 antialiased", { "modal-open": false })}>
        <AuthProvider>
          <Navigation />
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
