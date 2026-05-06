"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CandidateForm } from "../components/CandidateForm";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === "CANDIDATE") {
      router.replace("/profile");
    } else if (user.role === "ADMIN") {
      router.replace("/admin");
    } else if (user.role === "RECRUITER") {
      router.replace("/recruiter");
    }
  }, [isLoading, user, router]);

  const summaryCards = [
    {
      title: "Active evaluations",
      metric: "38",
      change: "+6.4%",
      caption: "vs last sprint",
      accent: "from-blue-500/50 via-blue-500/20 to-blue-500/5",
    },
    {
      title: "Scorecards published",
      metric: "124",
      change: "98%",
      caption: "on-time insights",
      accent: "from-emerald-500/50 via-emerald-500/20 to-emerald-500/5",
    },
    {
      title: "Average readiness",
      metric: "82",
      change: "+3 pts",
      caption: "this quarter",
      accent: "from-amber-500/50 via-amber-500/20 to-amber-500/5",
    },
    {
      title: "Best-fit matches",
      metric: "12",
      change: "4 pending",
      caption: "awaiting review",
      accent: "from-purple-500/50 via-purple-500/20 to-purple-500/5",
    },
  ];

  const pipelineStages = [
    { stage: "Applied", count: 58, delta: "+12" },
    { stage: "Screened", count: 36, delta: "+4" },
    { stage: "Interview", count: 26, delta: "-2" },
    { stage: "Offer", count: 9, delta: "+1" },
  ];

  const readinessSignals = [
    { label: "Technical depth", score: 86 },
    { label: "Leadership", score: 78 },
    { label: "Collaboration", score: 91 },
    { label: "Delivery velocity", score: 74 },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const redirectMessage = (label: string) => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg text-slate-300">Taking you to the {label}...</div>
    </div>
  );

  if (user.role === "CANDIDATE") {
    return redirectMessage("candidate workspace");
  }

  if (user.role === "ADMIN") {
    return redirectMessage("admin console");
  }

  if (user.role === "RECRUITER") {
    return redirectMessage("recruiter desk");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-blue-900/40 p-8 shadow-2xl shadow-blue-900/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.3em] text-blue-200">
                Dynamic competency graph
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-5xl">
                Measure what matters. Explain every decision. Guide every career.
              </h1>
              <p className="mt-4 max-w-3xl text-base text-slate-200">
                Ingest resumes, portfolios, and behavioral signals, then fuse them with AI-powered reasoning for bias-aware scorecards and ready-to-share talent stories.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-5 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Admin</p>
              <p className="text-lg font-semibold text-white">{user.full_name}</p>
              <p className="text-sm text-slate-300">{user.email}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{card.title}</p>
              <div className="mt-4 flex items-end justify-between">
                <p className="text-4xl font-semibold text-white">{card.metric}</p>
                <span className="text-sm text-slate-300">{card.caption}</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-200">{card.change}</div>
              <div className={`mt-4 h-2 rounded-full bg-gradient-to-r ${card.accent}`} />
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Candidate intake</p>
                <h2 className="text-2xl font-semibold text-white">Launch new competency analysis</h2>
              </div>
              <div className="text-xs text-slate-400">Last synced 4 min ago</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <CandidateForm />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Pipeline health</p>
                  <h3 className="text-xl font-semibold text-white">Live funnel overview</h3>
                </div>
                <span className="text-xs text-slate-400">Updated now</span>
              </div>
              <div className="mt-6 space-y-4">
                {pipelineStages.map((stage) => (
                  <div key={stage.stage} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{stage.stage}</p>
                      <p className="text-xs text-slate-400">{stage.delta} this week</p>
                    </div>
                    <p className="text-2xl font-semibold text-white">{stage.count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Signals & readiness</p>
                  <h3 className="text-xl font-semibold text-white">Stacked radar preview</h3>
                </div>
                <span className="text-xs text-slate-400">Score trend</span>
              </div>
              <div className="mt-6 space-y-4">
                {readinessSignals.map((signal) => (
                  <div key={signal.label}>
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{signal.label}</span>
                      <span className="font-semibold text-white">{signal.score}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 to-emerald-200"
                        style={{ width: `${signal.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Signal graph</p>
              <h3 className="text-2xl font-semibold text-white">Weekly competency momentum</h3>
            </div>
            <span className="text-xs text-slate-400">Data refreshed 12 mins ago</span>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <p className="text-sm font-semibold text-white">Score velocity</p>
              <div className="mt-4 h-32 rounded-2xl bg-gradient-to-r from-blue-600/60 via-blue-400/30 to-transparent">
                <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" />
              </div>
              <p className="mt-3 text-xs text-slate-400">Steady lift after enablement sprint.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <p className="text-sm font-semibold text-white">Gap closure</p>
              <div className="mt-4 space-y-3">
                {["Architecture", "Storytelling", "Delivery"].map((skill, index) => (
                  <div key={skill} className="rounded-xl border border-white/10 p-3">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{skill}</span>
                      <span className="font-semibold text-white">{68 + index * 6}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-indigo-200"
                        style={{ width: `${68 + index * 6}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">Focus on storytelling for quickest lift.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
