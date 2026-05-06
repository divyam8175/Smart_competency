"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from "recharts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface ScorecardData {
  technical_skill_index: number;
  cognitive_ability_index: number;
  behavioral_fit_score: number;
  learning_agility_score: number;
  growth_potential_score: number;
  job_role_match: number;
  best_fit_roles: string[];
  strength_summary: string;
  weakness_summary: string;
}

interface AnalysisData {
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
}

interface StoredAnalysis {
  analysis?: AnalysisData;
  jobTitle?: string;
  createdAt?: string;
  jobDescription?: StoredJobDescription;
}

interface StoredJobDescription {
  title?: string;
  description?: string;
  required_skills?: string[] | string;
  experience_required?: number | string | null;
  responsibilities?: string;
  qualifications?: string;
}

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

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [jobTitle, setJobTitle] = useState<string | undefined>();
  const [timestamp, setTimestamp] = useState<string | undefined>();
  const [jobDescription, setJobDescription] = useState<StoredJobDescription | null>(null);
  const [roadmap, setRoadmap] = useState<LearningRoadmap | null>(null);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const router = useRouter();
  const roadmapMeta = useMemo<RoadmapMetaStats | null>(() => {
    if (!roadmap) return null;
    const totals = roadmap.phases.reduce(
      (acc, phase) => {
        acc.actions += phase.actions.length;
        acc.outcomes += phase.outcomes.length;
        return acc;
      },
      { actions: 0, outcomes: 0 }
    );
    return {
      phases: roadmap.phases.length,
      actions: totals.actions,
      outcomes: totals.outcomes,
    };
  }, [roadmap]);
  const emptyScorecard: ScorecardData = {
    technical_skill_index: 0,
    cognitive_ability_index: 0,
    behavioral_fit_score: 0,
    learning_agility_score: 0,
    growth_potential_score: 0,
    job_role_match: 0,
    best_fit_roles: [],
    strength_summary: "",
    weakness_summary: "",
  };

  useEffect(() => {
    const data = localStorage.getItem("latest_analysis");
    if (!data) {
      router.push("/profile");
      return;
    }
    try {
      const parsed: StoredAnalysis | AnalysisData = JSON.parse(data);
      if ("analysis" in parsed && parsed.analysis) {
        setAnalysis(parsed.analysis);
        setJobTitle(parsed.jobTitle);
        setTimestamp(parsed.createdAt);
        setJobDescription(parsed.jobDescription ?? null);
      } else {
        setAnalysis(parsed as AnalysisData);
        setJobDescription(null);
      }
    } catch (error) {
      console.error("Failed to parse analysis", error);
      router.push("/profile");
    }
  }, [router]);

  if (!analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-300">Loading analysis...</div>
      </div>
    );
  }

  const scorecard = analysis.scorecard ?? emptyScorecard;
  const jobRoleMatch = scorecard.job_role_match || analysis.overall_match;
  const scorecardRadarData = [
    { category: "Technical", score: scorecard.technical_skill_index },
    { category: "Cognitive", score: scorecard.cognitive_ability_index },
    { category: "Behavioral", score: scorecard.behavioral_fit_score },
    { category: "Learning", score: scorecard.learning_agility_score },
    { category: "Growth", score: scorecard.growth_potential_score },
  ];
  const scorecardMetrics = [
    { label: "Technical Skill", value: scorecard.technical_skill_index },
    { label: "Cognitive Ability", value: scorecard.cognitive_ability_index },
    { label: "Behavioral Fit", value: scorecard.behavioral_fit_score },
    { label: "Learning Agility", value: scorecard.learning_agility_score },
    { label: "Growth Potential", value: scorecard.growth_potential_score },
  ];
  const bestFitRoles = (scorecard.best_fit_roles?.filter(Boolean) ?? []).slice(0, 5);
  const strengthSummary = scorecard.strength_summary || "Summary not available yet.";
  const weaknessSummary = scorecard.weakness_summary || "Add more data to generate a weakness summary.";

  // Prepare data for bar chart
  const barData = [
    { name: "Overall", value: analysis.overall_match, color: "#3b82f6" },
    { name: "Skills", value: analysis.skills_match, color: "#10b981" },
    { name: "Experience", value: analysis.experience_match, color: "#f59e0b" },
    { name: "Education", value: analysis.education_match, color: "#8b5cf6" },
    { name: "Responsibilities", value: analysis.responsibility_match, color: "#ec4899" },
  ];

  // Gap analysis data (how much is missing for each dimension)
  const gapData = [
    { name: "Skills", achieved: analysis.skills_match, gap: 100 - analysis.skills_match },
    { name: "Experience", achieved: analysis.experience_match, gap: 100 - analysis.experience_match },
    { name: "Education", achieved: analysis.education_match, gap: 100 - analysis.education_match },
    { name: "Responsibilities", achieved: analysis.responsibility_match, gap: 100 - analysis.responsibility_match },
  ];

  // Pie chart data for scorecard distribution
  const pieData = [
    { name: "Technical", value: scorecard.technical_skill_index, fill: "#3b82f6" },
    { name: "Cognitive", value: scorecard.cognitive_ability_index, fill: "#8b5cf6" },
    { name: "Behavioral", value: scorecard.behavioral_fit_score, fill: "#10b981" },
    { name: "Learning", value: scorecard.learning_agility_score, fill: "#f59e0b" },
    { name: "Growth", value: scorecard.growth_potential_score, fill: "#ec4899" },
  ];

  // Comparison line chart: actual vs ideal (100)
  const comparisonLineData = [
    { dimension: "Technical", actual: scorecard.technical_skill_index, ideal: 100 },
    { dimension: "Cognitive", actual: scorecard.cognitive_ability_index, ideal: 100 },
    { dimension: "Behavioral", actual: scorecard.behavioral_fit_score, ideal: 100 },
    { dimension: "Learning", actual: scorecard.learning_agility_score, ideal: 100 },
    { dimension: "Growth", actual: scorecard.growth_potential_score, ideal: 100 },
    { dimension: "Overall", actual: analysis.overall_match, ideal: 100 },
  ];

  // Strengths vs weaknesses count for pie
  const insightsPieData = [
    { name: "Strengths", value: analysis.strengths.length, fill: "#10b981" },
    { name: "Gaps", value: analysis.gaps.length, fill: "#ef4444" },
    { name: "Recommendations", value: analysis.recommendations.length, fill: "#3b82f6" },
  ];

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-emerald-300";
    if (score >= 60) return "text-amber-300";
    return "text-rose-300";
  };

  const getMatchGradient = (score: number) => {
    if (score >= 80) return "from-emerald-500/40 via-emerald-500/10 to-transparent";
    if (score >= 60) return "from-amber-500/40 via-amber-500/10 to-transparent";
    return "from-rose-500/40 via-rose-500/10 to-transparent";
  };

  const matchNarrative =
    analysis.overall_match >= 80
      ? "Excellent fit for this role!"
      : analysis.overall_match >= 60
      ? "Good match with some focused improvements."
      : "Consider developing the highlighted skills before applying.";

  const detailMetrics = [
    { label: "Skills", value: analysis.skills_match },
    { label: "Experience", value: analysis.experience_match },
    { label: "Education", value: analysis.education_match },
    { label: "Responsibilities", value: analysis.responsibility_match },
  ];

  const hasJobContext = Boolean(jobDescription?.title && jobDescription?.description);

  const handleGenerateRoadmap = async () => {
    if (!hasJobContext) {
      setRoadmapError("Provide a job description to build a roadmap.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    const normalizedSkills = Array.isArray(jobDescription?.required_skills)
      ? (jobDescription?.required_skills as string[])
      : jobDescription?.required_skills
      ? String(jobDescription?.required_skills)
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [];

    const normalizedJobDescription = {
      title: jobDescription?.title ?? jobTitle ?? "Target Role",
      description: jobDescription?.description ?? "",
      required_skills: normalizedSkills,
      experience_required:
        typeof jobDescription?.experience_required === "number"
          ? jobDescription?.experience_required
          : jobDescription?.experience_required
          ? Number(jobDescription?.experience_required)
          : null,
      responsibilities: jobDescription?.responsibilities ?? "",
      qualifications: jobDescription?.qualifications ?? "",
    };

    setIsGeneratingRoadmap(true);
    setRoadmapError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/roadmap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidate_id: "me",
          job_description: normalizedJobDescription,
          target_role: jobTitle ?? normalizedJobDescription.title,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || "Failed to generate roadmap");
      }

      const roadmapPayload: LearningRoadmap = await response.json();
      setRoadmap(roadmapPayload);
      localStorage.setItem("latest_roadmap", JSON.stringify(roadmapPayload));
      router.push("/analysis/roadmap");
    } catch (error) {
      setRoadmapError(error instanceof Error ? error.message : "Unable to generate roadmap");
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full space-y-8 px-4 py-6 sm:px-6 lg:px-8">

        {/* Page title bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/profile")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Compatibility Analysis</h1>
              {jobTitle && <p className="text-sm text-slate-400">Role: {jobTitle}</p>}
            </div>
          </div>
          {timestamp && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {new Date(timestamp).toLocaleString()}
            </span>
          )}
        </div>

        {/* Score overview - all metrics together */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/80 to-blue-900/20 p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
            {/* Main scores */}
            <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${getMatchGradient(analysis.overall_match)} opacity-50`} />
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Overall match</p>
                <p className="mt-2 text-5xl font-bold text-white">{analysis.overall_match.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-slate-200">{matchNarrative}</p>
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Job role match</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{jobRoleMatch.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Scorecard metrics grid */}
            <div className="grid grid-cols-2 gap-3">
              {scorecardMetrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${getMatchColor(metric.value)}`}>{metric.value.toFixed(0)}%</p>
                </div>
              ))}
              {/* Overall in grid too */}
              <div className="col-span-2 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Compatibility dimensions</p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {detailMetrics.map((m) => (
                    <div key={m.label}>
                      <p className="text-[9px] text-slate-500">{m.label}</p>
                      <p className={`text-sm font-bold ${getMatchColor(m.value)}`}>{m.value.toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary + roles */}
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">💪 Strength</p>
                <p className="mt-1 text-xs text-slate-200 leading-relaxed">{strengthSummary}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-rose-400">⚡ Weakness</p>
                <p className="mt-1 text-xs text-slate-200 leading-relaxed">{weaknessSummary}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400">🎯 Best-fit roles</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {bestFitRoles.length > 0 ? (
                    bestFitRoles.map((role) => (
                      <span key={role} className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-100">
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No suggestions yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* All charts together */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-white">📊 Visual insights</h2>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Radar */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-sm font-semibold text-white">Capability radar</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={scorecardRadarData}>
                    <PolarGrid stroke="#94a3b8" strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="category" tick={{ fill: "#cbd5f5", fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 9 }} stroke="#1e293b" />
                    <Radar name="Score" dataKey="score" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar chart */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-sm font-semibold text-white">Compatibility breakdown</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gap analysis */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-sm font-semibold text-white">Gap analysis</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gapData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" width={80} fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                    <Bar dataKey="achieved" stackId="stack" fill="#10b981" name="Achieved" />
                    <Bar dataKey="gap" stackId="stack" fill="#374151" radius={[0, 4, 4, 0]} name="Gap" />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Competency pie */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-sm font-semibold text-white">Competency distribution</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line chart */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-sm font-semibold text-white">Actual vs target</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonLineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="dimension" stroke="#94a3b8" fontSize={9} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} name="Your score" />
                    <Line type="monotone" dataKey="ideal" stroke="#4ade80" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insights pie */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-sm font-semibold text-white">Insights breakdown</h3>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insightsPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {insightsPieData.map((entry, index) => (
                        <Cell key={`insights-pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* AI Analysis - highlighted */}
        <section className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-lg">🤖</span>
            <div>
              <h2 className="text-xl font-bold text-white">AI-Powered Analysis</h2>
              <p className="text-xs text-indigo-200">Deep assessment generated from your profile and job requirements</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {analysis.detailed_analysis.split("\n").filter(Boolean).map((paragraph, idx) => (
              <div key={`ai-para-${idx}`} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-xs text-indigo-200">
                  {idx + 1}
                </span>
                <p className="text-sm leading-relaxed text-slate-100">{paragraph.trim()}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Strengths, Gaps, Recommendations */}
        <section className="grid gap-6 lg:grid-cols-3">
          <InsightCard title="Strengths" accent="from-emerald-500/20" items={analysis.strengths} icon="✅" badgeColor="text-emerald-400" />
          <InsightCard title="Gaps" accent="from-rose-500/20" items={analysis.gaps} icon="🔴" badgeColor="text-rose-400" />
          <InsightCard title="Recommendations" accent="from-blue-500/20" items={analysis.recommendations} icon="💡" badgeColor="text-blue-400" />
        </section>

        {/* Roadmap CTA */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-lg">🗺️</span>
              <div>
                <h3 className="text-lg font-semibold text-white">Learning Roadmap</h3>
                <p className="text-xs text-slate-300">Generate an AI-powered plan tailored to this role</p>
              </div>
            </div>
            <button
              onClick={handleGenerateRoadmap}
              disabled={!hasJobContext || isGeneratingRoadmap}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isGeneratingRoadmap ? "Creating..." : roadmap ? "Regenerate" : "Create roadmap"}
            </button>
          </div>
          {!hasJobContext && (
            <p className="mt-3 text-xs text-amber-300">Capture a job description to unlock roadmap generation.</p>
          )}
          {roadmapError && (
            <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{roadmapError}</p>
          )}
          {roadmap && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3">
              <span className="text-sm text-emerald-100">✓ Roadmap generated — {roadmap.phases.length} phases, {roadmap.quick_wins.length} quick wins</span>
              <button
                onClick={() => router.push("/analysis/roadmap")}
                className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
              >
                Open roadmap →
              </button>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={() => router.push("/profile")}
            className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Analyze another role
          </button>
          <button
            onClick={() => router.push("/profile/history")}
            className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View history
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
          >
            Print report
          </button>
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  items,
  accent,
  icon,
  badgeColor,
}: {
  title: string;
  items: string[];
  accent: string;
  icon: string;
  badgeColor?: string;
}) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-br ${accent} via-slate-900/60 to-slate-900/80 p-6`}>
      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
        <span>{icon}</span>
        {title}
        <span className={`ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs ${badgeColor ?? "text-slate-300"}`}>
          {items.length}
        </span>
      </h3>
      <ul className="mt-4 space-y-3 text-sm text-slate-100">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`} className="flex items-start gap-2">
            <span className={`mt-0.5 text-xs ${badgeColor ?? "text-slate-300"}`}>●</span>
            <span>{item}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-slate-400">No data yet.</li>}
      </ul>
    </div>
  );
}

function RoadmapStat({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{caption}</p>
    </div>
  );
}
