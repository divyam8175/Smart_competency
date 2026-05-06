"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type JobPosting = {
  _id: string;
  title: string;
  description: string;
  required_skills?: string[];
  location?: string;
  employment_type?: string;
  status: string;
  created_at?: string;
};

type Application = {
  _id: string;
  job_id: string;
  job_title?: string;
  status: string;
  created_at: string;
};

export default function BrowseJobsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [withdrawingJobId, setWithdrawingJobId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "applied">("browse");
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    void loadJobs();
    void loadMyApplications();
  }, [isLoading, user, router]);

  const authHeaders = () => {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` } as Record<string, string>;
  };

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (skillFilter) params.append("skill", skillFilter);
      if (locationFilter) params.append("location", locationFilter);
      const query = params.toString();
      const res = await fetch(`${API_BASE_URL}/api/candidates/jobs/browse${query ? `?${query}` : ""}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Unable to load jobs");
      setJobs(await res.json());
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load jobs" });
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadMyApplications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/candidates/jobs/my-applications`, { headers: authHeaders() });
      if (res.ok) setApplications(await res.json());
    } catch { /* ignore */ }
  };

  const applyToJob = async (jobId: string) => {
    try {
      setApplyingJobId(jobId);
      const res = await fetch(`${API_BASE_URL}/api/candidates/jobs/${jobId}/apply`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.detail || "Unable to apply");
      }
      const app = await res.json();
      setApplications((prev) => [app, ...prev]);
      setToast({ type: "success", message: "Application submitted!" });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to apply" });
    } finally {
      setApplyingJobId(null);
    }
  };

  const withdrawApplication = async (jobId: string) => {
    try {
      setWithdrawingJobId(jobId);
      const res = await fetch(`${API_BASE_URL}/api/candidates/jobs/${jobId}/withdraw`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to withdraw");
      setApplications((prev) => prev.map((a) => a.job_id === jobId ? { ...a, status: "WITHDRAWN" } : a));
      setToast({ type: "success", message: "Application withdrawn" });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to withdraw" });
    } finally {
      setWithdrawingJobId(null);
    }
  };

  const getApplicationForJob = (jobId: string) => applications.find((a) => a.job_id === jobId);

  const runAiAnalysis = async (job: JobPosting) => {
    try {
      setAnalyzingJobId(job._id);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const processedJobDescription = {
        title: job.title,
        description: job.description,
        required_skills: job.required_skills || [],
        experience_required: null,
        responsibilities: null,
        qualifications: null,
      };

      const payload = {
        candidate_id: "me",
        job_description: processedJobDescription,
      };

      const response = await fetch(`${API_BASE_URL}/api/profile/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || "Analysis failed");
      }

      const analysis = await response.json();

      localStorage.setItem(
        "latest_analysis",
        JSON.stringify({
          analysis,
          jobTitle: job.title,
          jobDescription: processedJobDescription,
          createdAt: new Date().toISOString(),
        })
      );

      window.location.href = "/analysis";
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "AI Analysis failed" });
    } finally {
      setAnalyzingJobId(null);
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full space-y-8 px-6 py-10 lg:px-12">
        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-indigo-900/30 p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">Career opportunities</p>
              <h1 className="mt-2 text-3xl font-semibold">Browse Open Positions</h1>
              <p className="text-sm text-slate-200">Discover roles that match your skills and apply directly.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab("browse")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === "browse" ? "bg-indigo-500 text-white" : "border border-white/20 text-white hover:bg-white/10"}`}
              >
                Browse Jobs
              </button>
              <button
                onClick={() => setActiveTab("applied")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === "applied" ? "bg-indigo-500 text-white" : "border border-white/20 text-white hover:bg-white/10"}`}
              >
                My Applications ({applications.filter((a) => a.status === "APPLIED").length})
              </button>
            </div>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${toast.type === "success" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-rose-400/40 bg-rose-500/10 text-rose-100"}`}>
            {toast.message}
          </div>
        )}

        {activeTab === "browse" && (
          <>
            {/* Filters */}
            <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                <label className="text-xs text-slate-300">
                  Search
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" placeholder="Job title, keyword..." />
                </label>
                <label className="text-xs text-slate-300">
                  Skill
                  <input value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" placeholder="e.g. React, Python" />
                </label>
                <label className="text-xs text-slate-300">
                  Location
                  <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" placeholder="Remote, NYC..." />
                </label>
                <div className="flex items-end">
                  <button onClick={() => void loadJobs()} className="w-full rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">Search</button>
                </div>
              </div>
            </section>

            {/* Jobs Grid */}
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loadingJobs ? (
                <div className="col-span-full rounded-2xl border border-dashed border-white/20 p-6 text-sm text-slate-300">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-300">
                  <p className="text-lg font-semibold text-slate-200">No open positions found</p>
                  <p className="mt-1">Try adjusting your filters or check back later.</p>
                </div>
              ) : (
                jobs.map((job) => {
                  const app = getApplicationForJob(job._id);
                  const hasApplied = app && app.status === "APPLIED";
                  return (
                    <article key={job._id} className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 flex flex-col">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                            {job.location && <span className="flex items-center gap-1">📍 {job.location}</span>}
                            {job.employment_type && <span className="flex items-center gap-1">💼 {job.employment_type}</span>}
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200">OPEN</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300 line-clamp-3 flex-1">{job.description}</p>
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {job.required_skills.slice(0, 5).map((skill) => (
                            <span key={skill} className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-200">{skill}</span>
                          ))}
                          {job.required_skills.length > 5 && <span className="text-xs text-slate-400">+{job.required_skills.length - 5} more</span>}
                        </div>
                      )}
                      {job.created_at && (
                        <p className="mt-3 text-[11px] text-slate-500">Posted {new Date(job.created_at).toLocaleDateString()}</p>
                      )}
                      <div className="mt-4 space-y-2">
                        {/* AI Analysis Button */}
                        <button
                          onClick={() => runAiAnalysis(job)}
                          disabled={analyzingJobId === job._id}
                          className="w-full rounded-2xl border border-purple-400/50 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-4 py-2.5 text-sm font-semibold text-purple-100 hover:from-purple-500/20 hover:to-blue-500/20 disabled:opacity-60"
                        >
                          {analyzingJobId === job._id ? "⏳ Analyzing your fit..." : "🤖 AI Match Analysis"}
                        </button>
                        {/* Apply / Status */}
                        {hasApplied ? (
                          <button
                            onClick={() => withdrawApplication(job._id)}
                            disabled={withdrawingJobId === job._id}
                            className="w-full rounded-2xl border border-rose-400/60 px-4 py-2.5 text-sm font-semibold text-rose-100 hover:bg-rose-500/10 disabled:opacity-60"
                          >
                            {withdrawingJobId === job._id ? "Withdrawing..." : "Withdraw Application"}
                          </button>
                        ) : app?.status === "WITHDRAWN" ? (
                          <div className="w-full rounded-2xl border border-slate-400/30 bg-slate-500/10 px-4 py-2.5 text-center text-sm text-slate-300">Withdrawn</div>
                        ) : app?.status === "SHORTLISTED" ? (
                          <div className="w-full rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-semibold text-emerald-100">🎉 Shortlisted!</div>
                        ) : (
                          <button
                            onClick={() => applyToJob(job._id)}
                            disabled={applyingJobId === job._id}
                            className="w-full rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:bg-slate-600"
                          >
                            {applyingJobId === job._id ? "Applying..." : "Apply Now"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </>
        )}

        {activeTab === "applied" && (
          <section className="space-y-4">
            {applications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-300">
                <p className="text-lg font-semibold text-slate-200">No applications yet</p>
                <p className="mt-1">Browse jobs and apply to get started!</p>
              </div>
            ) : (
              applications.map((app) => (
                <article key={app._id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{app.job_title || "Untitled Role"}</p>
                    <p className="text-xs text-slate-400">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider ${
                      app.status === "APPLIED" ? "border-blue-400/50 bg-blue-500/10 text-blue-100" :
                      app.status === "SHORTLISTED" ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100" :
                      app.status === "REJECTED" ? "border-rose-400/50 bg-rose-500/10 text-rose-100" :
                      "border-slate-400/30 bg-slate-500/10 text-slate-200"
                    }`}>{app.status}</span>
                    {app.status === "APPLIED" && (
                      <button
                        onClick={() => withdrawApplication(app.job_id)}
                        disabled={withdrawingJobId === app.job_id}
                        className="rounded-xl border border-rose-400/50 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}
