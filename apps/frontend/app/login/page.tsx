"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const highlights = [
    {
      title: "Explainable decisions",
      body: "Share AI reasoning with hiring panels instantly.",
    },
    {
      title: "Live pipelines",
      body: "Monitor candidate journeys with adaptive scorecards.",
    },
    {
      title: "Secure by design",
      body: "Role-aware workflows keep data scoped to the right team.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen items-stretch lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden px-10 py-16 sm:px-16">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900 opacity-70" />
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative z-10 max-w-xl space-y-8">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-blue-200">
                Smart Competency Builder
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Precision insights for every hiring decision.
              </h1>
              <p className="mt-4 text-base text-slate-200">
                Sign in to orchestrate talent reviews, compare candidates with AI-native scorecards, and publish shareable insights.
              </p>
            </div>
            <div className="space-y-4">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-sm text-slate-200">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white text-slate-900">
          <div className="w-full max-w-md p-10">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-semibold text-slate-900">Welcome back</h2>
              <p className="text-sm text-slate-500">Enter your credentials to unlock the command center.</p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 focus:outline-none disabled:bg-slate-400"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>
                <p className="text-center text-sm text-slate-500">
                  No account yet?{" "}
                  <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-500">
                    Create one
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
