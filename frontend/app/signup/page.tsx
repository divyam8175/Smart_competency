"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"CANDIDATE" | "ADMIN" | "RECRUITER">("CANDIDATE");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signup(email, password, fullName, role);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const highlights = [
    {
      title: "AI-native transparency",
      body: "Surface score rationales, evidence, and coaching takeaways in one view.",
    },
    {
      title: "Role-aware spaces",
      body: "Candidates focus on their journey while admins curate hiring pipelines.",
    },
    {
      title: "Signals that scale",
      body: "Blend portfolios, interviews, and behavioral data into living scorecards.",
    },
  ];

  const roleOptions: Array<{
    value: "CANDIDATE" | "ADMIN" | "RECRUITER";
    label: string;
    description: string;
  }> = [
    {
      value: "CANDIDATE",
      label: "Candidate Workspace",
      description: "Explore readiness insights, upload resumes, and track guidance.",
    },
    {
      value: "ADMIN",
      label: "Admin Command",
      description: "Design scorecards, trigger AI analysis, and publish comparisons.",
    },
    {
      value: "RECRUITER",
      label: "Recruiter Portal",
      description: "Manage requisitions, collaborate with admins, and review talent pipelines.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen items-stretch lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden px-10 py-16 sm:px-16">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900 opacity-70" />
          <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative z-10 max-w-xl space-y-8">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-emerald-200">
                Build your workspace
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Shape smarter competency decisions for every journey.
              </h1>
              <p className="mt-4 text-base text-slate-200">
                Create a profile to orchestrate candidate reviews, nudge growth plans, and keep every decision explainable.
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
              <h2 className="text-3xl font-semibold text-slate-900">Create your account</h2>
              <p className="text-sm text-slate-500">
                Already aligned with the team?{" "}
                <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500">
                  Sign in
                </Link>
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Choose your space</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {roleOptions.map((roleOption) => {
                    const isActive = roleOption.value === role;
                    return (
                      <button
                        type="button"
                        key={roleOption.value}
                        onClick={() => setRole(roleOption.value)}
                        className={`rounded-2xl border px-4 py-4 text-left text-sm transition focus:outline-none ${
                          isActive
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-lg"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <p className="font-semibold">{roleOption.label}</p>
                        <p className="text-xs text-slate-500">{roleOption.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 focus:outline-none disabled:bg-slate-400"
                >
                  {isLoading ? "Creating account..." : "Sign up"}
                </button>
                <p className="text-center text-xs text-slate-400">
                  By creating an account you agree to our responsible AI guidelines.
                </p>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
