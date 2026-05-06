"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface RoadmapAction {
  title: string;
  description: string;
  resources: string[];
}

interface RoadmapPhase {
  title: string;
  duration: string;
  focus: string;
  outcomes: string[];
  actions: RoadmapAction[];
}

interface LearningRoadmap {
  headline: string;
  goal_summary: string;
  phases: RoadmapPhase[];
  quick_wins: string[];
  ongoing_habits: string[];
  suggested_resources: string[];
  success_metrics: string[];
}

type RoadmapMetaStats = {
  phases: number;
  actions: number;
  outcomes: number;
};

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<LearningRoadmap | null>(null);
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem("latest_roadmap");
    if (!data) {
      router.push("/analysis");
      return;
    }
    try {
      const parsed: LearningRoadmap = JSON.parse(data);
      setRoadmap(parsed);
    } catch {
      router.push("/analysis");
    }
  }, [router]);

  const meta = useMemo<RoadmapMetaStats | null>(() => {
    if (!roadmap) return null;
    const totals = roadmap.phases.reduce(
      (acc, phase) => {
        acc.actions += phase.actions.length;
        acc.outcomes += phase.outcomes.length;
        return acc;
      },
      { actions: 0, outcomes: 0 }
    );
    return { phases: roadmap.phases.length, actions: totals.actions, outcomes: totals.outcomes };
  }, [roadmap]);

  if (!roadmap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-lg text-slate-300">Loading roadmap...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-emerald-900/30 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <button
              onClick={() => router.push("/analysis")}
              className="inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              ← Back to analysis
            </button>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Learning roadmap</p>
            <h1 className="text-3xl font-semibold leading-tight text-white">{roadmap.headline}</h1>
            <p className="mt-2 text-sm text-slate-200">{roadmap.goal_summary}</p>
          </div>
        </header>

        {/* Stats overview */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Phases" value={meta?.phases ?? 0} caption="Structured milestones" />
          <StatCard label="Actions" value={meta?.actions ?? 0} caption="Hands-on tasks" />
          <StatCard label="Outcomes" value={meta?.outcomes ?? 0} caption="Measurable goals" />
          <StatCard label="Quick wins" value={roadmap.quick_wins.length} caption="Momentum boosters" />
        </section>

        {/* Quick wins & habits */}
        <section className="grid gap-6 md:grid-cols-2">
          <BadgeList
            title="Quick wins"
            items={roadmap.quick_wins}
            badgeClass="bg-emerald-500/20 text-emerald-100 border border-emerald-400/30"
          />
          <BadgeList
            title="Ongoing habits"
            items={roadmap.ongoing_habits}
            badgeClass="bg-blue-500/15 text-blue-100 border border-blue-400/30"
          />
        </section>

        {/* Resources & metrics */}
        <section className="grid gap-6 md:grid-cols-2">
          <InfoPanel title="Suggested resources" items={roadmap.suggested_resources} icon="📚" />
          <InfoPanel title="Success metrics" items={roadmap.success_metrics} icon="📈" />
        </section>

        {/* Phases timeline */}
        <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Phase-by-phase plan</p>
              <h2 className="text-2xl font-semibold text-white">Execution timeline</h2>
            </div>
            <span className="text-xs text-slate-400">{roadmap.phases.length} phases</span>
          </div>
          <div className="mt-8 space-y-8">
            {roadmap.phases.map((phase, index) => (
              <PhaseCard key={`${phase.title}-${index}`} phase={phase} index={index} isLast={index === roadmap.phases.length - 1} />
            ))}
          </div>
        </section>

        {/* Bottom actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={() => router.push("/analysis")}
            className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ← Back to analysis
          </button>
          <button
            onClick={() => router.push("/profile/history")}
            className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View history
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700"
          >
            Print roadmap
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{caption}</p>
    </div>
  );
}

function BadgeList({ title, items, badgeClass }: { title: string; items: string[]; badgeClass: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No entries yet.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span key={`${title}-${index}`} className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoPanel({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Add more inputs to unlock insights.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-slate-100">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-2">
              <span className="text-slate-500">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhaseCard({ phase, index, isLast }: { phase: RoadmapPhase; index: number; isLast: boolean }) {
  const accentClasses = [
    "bg-emerald-500/20 text-emerald-100 border border-emerald-400/30",
    "bg-blue-500/20 text-blue-100 border border-blue-400/30",
    "bg-purple-500/20 text-purple-100 border border-purple-400/30",
    "bg-amber-500/20 text-amber-100 border border-amber-400/30",
  ];
  const badgeClass = accentClasses[index % accentClasses.length];

  return (
    <div className="relative pl-14">
      <div className="absolute left-0 top-0 flex flex-col items-center">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${badgeClass}`}>
          {index + 1}
        </span>
        {!isLast && <span className="mt-2 h-full w-px bg-white/20" />}
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{phase.duration || "Flexible"}</p>
            <h5 className="text-lg font-semibold text-white">{phase.title}</h5>
          </div>
          {phase.focus && (
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200">{phase.focus}</span>
          )}
        </div>
        {phase.outcomes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Outcomes</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {phase.outcomes.map((outcome, i) => (
                <li key={`outcome-${i}`} className="flex items-start gap-2">
                  <span className="text-slate-400">–</span>
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {phase.actions.length > 0 && (
          <div className="mt-4 space-y-3">
            {phase.actions.map((action, i) => (
              <div key={`action-${i}`} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm font-semibold text-white">{action.title}</p>
                <p className="mt-1 text-sm text-slate-300">{action.description}</p>
                {action.resources.length > 0 && (
                  <div className="mt-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Resources:</span> {action.resources.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
