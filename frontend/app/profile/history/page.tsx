"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type ScorecardData = {
  technical_skill_index: number;
  cognitive_ability_index: number;
  behavioral_fit_score: number;
  learning_agility_score: number;
  growth_potential_score: number;
  job_role_match: number;
  best_fit_roles: string[];
  strength_summary: string;
  weakness_summary: string;
};

type AnalysisData = {
  overall_match: number;
  skills_match: number;
  experience_match: number;
  education_match: number;
  responsibility_match: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  detailed_analysis: string;
  scorecard?: ScorecardData | null;
};

type AnalysisRecord = {
  _id: string;
  job_title: string;
  created_at: string;
  analysis: AnalysisData;
};

type RoadmapAction = {
  title: string;
  description: string;
  resources: string[];
};

type RoadmapPhase = {
  title: string;
  duration: string;
  focus: string;
  outcomes: string[];
  actions: RoadmapAction[];
};

type RoadmapPlan = {
  headline: string;
  goal_summary: string;
  phases: RoadmapPhase[];
  quick_wins: string[];
  ongoing_habits: string[];
  suggested_resources: string[];
  success_metrics: string[];
};

type RoadmapRecord = {
  _id: string;
  job_title: string;
  target_role?: string;
  created_at: string;
  job_description?: Record<string, unknown>;
  roadmap: RoadmapPlan;
};

function valueToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record.resource === "string" && typeof record.why === "string") {
    return `${record.resource} - ${record.why}`;
  }
  if (typeof record.resource === "string") {
    return record.resource;
  }
  if (typeof record.title === "string") {
    return record.title;
  }

  try {
    return JSON.stringify(record);
  } catch {
    return "";
  }
}

function normalizeTextList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map(valueToText).filter((item): item is string => Boolean(item && item.trim()));
}

export default function HistoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isCandidate = user?.role === "CANDIDATE";

  const loadHistory = useCallback(async () => {
    if (!isCandidate) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const authHeaders = { Authorization: `Bearer ${token}` };
      const [analysisResponse, roadmapResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/profile/analyses`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/profile/roadmaps`, { headers: authHeaders }),
      ]);

      if (!analysisResponse.ok || !roadmapResponse.ok) {
        const detail =
          (!analysisResponse.ok && (await analysisResponse.json().catch(() => null))?.detail) ||
          (!roadmapResponse.ok && (await roadmapResponse.json().catch(() => null))?.detail) ||
          "Failed to load history";
        throw new Error(detail);
      }

      const [analysisData, roadmapData] = await Promise.all([
        analysisResponse.json() as Promise<AnalysisRecord[]>,
        roadmapResponse.json() as Promise<RoadmapRecord[]>,
      ]);

      const orderedAnalyses = [...analysisData].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const normalizedRoadmaps = (roadmapData ?? []).map((entry) => ({
        ...entry,
        roadmap: {
          headline: entry.roadmap?.headline ?? "Personalized roadmap",
          goal_summary: entry.roadmap?.goal_summary ?? "",
          phases: (entry.roadmap?.phases ?? []).map((phase: any) => ({
            ...phase,
            title: valueToText(phase?.title) || "Untitled phase",
            duration: valueToText(phase?.duration),
            focus: valueToText(phase?.focus),
            outcomes: normalizeTextList(phase?.outcomes),
            actions: (phase?.actions ?? []).map((action: any) => ({
              title: valueToText(action?.title) || "Action",
              description: valueToText(action?.description),
              resources: normalizeTextList(action?.resources),
            })),
          })) as RoadmapPhase[],
          quick_wins: normalizeTextList(entry.roadmap?.quick_wins),
          ongoing_habits: normalizeTextList(entry.roadmap?.ongoing_habits),
          suggested_resources: normalizeTextList(entry.roadmap?.suggested_resources),
          success_metrics: normalizeTextList(entry.roadmap?.success_metrics),
        } as RoadmapPlan,
      }));
      const orderedRoadmaps = normalizedRoadmaps.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setHistory(orderedAnalyses);
      setRoadmaps(orderedRoadmaps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load history");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isCandidate]);

  useEffect(() => {
    if (isCandidate) {
      loadHistory();
    }
  }, [isCandidate, loadHistory]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const summary = useMemo(() => {
    if (history.length === 0) {
      return {
        average: null as number | null,
        best: null as number | null,
        lastRun: null as string | null,
      };
    }

    const aggregate = history.reduce(
      (acc, record) => {
        const score = record.analysis.overall_match;
        acc.total += score;
        if (score > acc.best) acc.best = score;
        return acc;
      },
      { total: 0, best: 0 }
    );

    return {
      average: Number((aggregate.total / history.length).toFixed(1)),
      best: Number(aggregate.best.toFixed(1)),
      lastRun: history[0]?.created_at ?? null,
    };
  }, [history]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading history...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isCandidate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Restricted</p>
          <h1 className="mt-3 text-2xl font-semibold">Candidates only</h1>
          <p className="mt-2 text-slate-300">Switch to a candidate account to review compatibility history.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center justify-center rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-purple-900/40 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-purple-200">Session archive</p>
              <h1 className="mt-2 text-3xl font-semibold">History hub</h1>
              <p className="text-sm text-slate-200">
                Revisit every compatibility run, compare metrics, and jump back into any detailed analysis.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                ← Back to workspace
              </Link>
              <button
                onClick={loadHistory}
                disabled={isRefreshing}
                className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition hover:bg-purple-700 disabled:bg-slate-600"
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Total sessions" value={history.length} caption="Compatibility runs tracked" />
          <SummaryCard
            label="Average match"
            value={summary.average !== null ? `${summary.average}%` : "—"}
            caption={history.length ? "Across all runs" : "Run an analysis to begin"}
          />
          <SummaryCard
            label="Best score"
            value={summary.best !== null ? `${summary.best}%` : "—"}
            caption={history.length ? "Peak compatibility" : "No data yet"}
          />
          <SummaryCard
            label="Last run"
            value={summary.lastRun ? new Date(summary.lastRun).toLocaleString() : "—"}
            caption={history.length ? "Most recent comparison" : "Awaiting first run"}
          />
          <SummaryCard
            label="Roadmaps saved"
            value={roadmaps.length}
            caption={roadmaps.length ? "Learning plans archived" : "Generate a roadmap to save it"}
          />
        </section>

        {history.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/60 p-8 text-center text-slate-300">
            <p className="text-sm">No history yet. Run your first comparison from the workspace.</p>
            <Link
              href="/profile"
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to workspace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <article key={record._id} className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Role analyzed</p>
                    <h2 className="text-xl font-semibold text-white">{record.job_title}</h2>
                    <p className="text-sm text-slate-400">{new Date(record.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Overall match</p>
                    <p className="text-4xl font-semibold text-blue-200">
                      {record.analysis.overall_match.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricPill label="Skills" value={record.analysis.skills_match} />
                  <MetricPill label="Experience" value={record.analysis.experience_match} />
                  <MetricPill label="Education" value={record.analysis.education_match} />
                  <MetricPill label="Responsibilities" value={record.analysis.responsibility_match} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => openAnalysis(record, router)}
                    className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    View detailed breakdown
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Learning roadmaps</p>
              <h2 className="text-2xl font-semibold text-white">Saved growth plans</h2>
              <p className="text-sm text-slate-300">Every roadmap you generate is archived here for quick reference.</p>
            </div>
            <button
              onClick={loadHistory}
              disabled={isRefreshing}
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isRefreshing ? "Refreshing..." : "Sync now"}
            </button>
          </div>

          {roadmaps.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/60 p-6 text-center text-slate-300">
              Generate a roadmap from the analysis page to start building this archive.
            </div>
          ) : (
            <div className="space-y-4">
              {roadmaps.map((record) => (
                <RoadmapHistoryCard key={record._id} record={record} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{caption}</p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "text-emerald-300" : value >= 60 ? "text-amber-300" : "text-rose-300";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value.toFixed(1)}%</p>
    </div>
  );
}

function openAnalysis(record: AnalysisRecord, router: ReturnType<typeof useRouter>) {
  localStorage.setItem(
    "latest_analysis",
    JSON.stringify({
      analysis: record.analysis,
      jobTitle: record.job_title,
      createdAt: record.created_at,
    })
  );
  router.push("/analysis");
}

function RoadmapHistoryCard({ record }: { record: RoadmapRecord }) {
  const totalActions = record.roadmap.phases.reduce((sum, phase) => sum + phase.actions.length, 0);
  const quickWins = record.roadmap.quick_wins.slice(0, 4);
  const resourceHighlights = record.roadmap.suggested_resources.slice(0, 4);

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Target role</p>
          <h3 className="text-xl font-semibold text-white">{record.target_role || record.job_title}</h3>
          <p className="text-sm text-slate-400">{new Date(record.created_at).toLocaleString()}</p>
        </div>
        <div className="text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 text-right">Job source</p>
          <p>{record.job_title}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-200">{record.roadmap.goal_summary || "Roadmap summary unavailable."}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <RoadmapMiniStat label="Phases" value={record.roadmap.phases.length} caption="Sequenced steps" />
        <RoadmapMiniStat label="Actions" value={totalActions} caption="Hands-on tasks" />
        <RoadmapMiniStat label="Quick wins" value={record.roadmap.quick_wins.length} caption="Momentum boosts" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <RoadmapChipList label="Quick wins" items={quickWins} />
        <RoadmapChipList label="Top resources" items={resourceHighlights} />
      </div>
      <details className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
        <summary className="cursor-pointer select-none text-sm font-semibold text-white">Phase breakdown</summary>
        <div className="mt-4 space-y-3">
          {record.roadmap.phases.map((phase, index) => (
            <RoadmapPhasePreview key={`${record._id}-phase-${index}`} phase={phase} index={index} />
          ))}
        </div>
      </details>
    </article>
  );
}

function RoadmapMiniStat({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{caption}</p>
    </div>
  );
}

function RoadmapChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No entries captured.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span key={`${label}-${index}`} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RoadmapPhasePreview({ phase, index }: { phase: RoadmapPhase; index: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          Phase {index + 1}: {phase.title}
        </p>
        <span className="text-xs text-slate-400">{phase.duration || "Flexible"}</span>
      </div>
      {phase.focus && <p className="text-xs text-slate-400">Focus: {phase.focus}</p>}
      {phase.actions.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          {phase.actions.length} actionable {phase.actions.length === 1 ? "step" : "steps"}
        </p>
      )}
    </div>
  );
}
