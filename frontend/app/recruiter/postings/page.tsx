"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type JobRecord = {
  _id: string;
  title: string;
  description: string;
  required_skills?: string[];
  location?: string;
  employment_type?: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
  recruiter_email: string;
  created_at?: string;
  updated_at?: string;
};

type InterviewRecord = {
  _id: string;
  job_id: string;
  job_title?: string;
  candidate_email: string;
  candidate_name?: string;
  recruiter_email: string;
  status: "ONGOING" | "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

type JobFormState = {
  title: string;
  description: string;
  required_skills: string;
  location: string;
  employment_type: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
};

type RankedCandidate = {
  rank: number;
  email: string;
  name: string;
  score: number;
  strengths: string[];
  gaps: string[];
  summary: string;
};

type RankingResult = {
  ranked_candidates: RankedCandidate[];
  job_title?: string;
  ai_note?: string;
  message?: string;
};

export default function RecruiterPostingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [editJobForm, setEditJobForm] = useState<JobFormState | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [updatingInterviewId, setUpdatingInterviewId] = useState<string | null>(null);
  // AI Ranking state
  const [rankingJobId, setRankingJobId] = useState<string | null>(null);
  const [rankingResult, setRankingResult] = useState<RankingResult | null>(null);
  const [showRankingModal, setShowRankingModal] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "RECRUITER" && user.role !== "ADMIN") return;
    void loadJobs();
    void loadInterviews();
  }, [isLoading, user, router]);

  const hasAccess = user && (user.role === "RECRUITER" || user.role === "ADMIN");

  const authHeaders = () => {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` } as Record<string, string>;
  };

  const parseSkills = (value: string) => value.split(",").map((s) => s.trim()).filter(Boolean);

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await fetch(`${API_BASE_URL}/api/recruiter/jobs`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Unable to load jobs");
      const data = (await response.json()) as JobRecord[];
      setJobs(data);
      if (data.length > 0 && !selectedJob) selectJob(data[0]);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load jobs" });
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadInterviews = async () => {
    try {
      setLoadingInterviews(true);
      const response = await fetch(`${API_BASE_URL}/api/recruiter/interviews`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Unable to load interviews");
      setInterviews(await response.json());
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load interviews" });
    } finally {
      setLoadingInterviews(false);
    }
  };

  const selectJob = (job: JobRecord) => {
    setSelectedJob(job);
    setEditJobForm({
      title: job.title ?? "",
      description: job.description ?? "",
      required_skills: (job.required_skills ?? []).join(", "),
      location: job.location ?? "",
      employment_type: job.employment_type ?? "",
      status: job.status ?? "OPEN",
    });
  };

  const updateJob = async () => {
    if (!selectedJob || !editJobForm) return;
    try {
      setSavingJob(true);
      const payload = {
        title: editJobForm.title.trim() || undefined,
        description: editJobForm.description.trim() || undefined,
        required_skills: parseSkills(editJobForm.required_skills),
        location: editJobForm.location.trim() || undefined,
        employment_type: editJobForm.employment_type.trim() || undefined,
        status: editJobForm.status,
      };
      const response = await fetch(`${API_BASE_URL}/api/recruiter/jobs/${selectedJob._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Unable to update job");
      const updated = (await response.json()) as JobRecord;
      setJobs((prev) => prev.map((j) => (j._id === updated._id ? updated : j)));
      selectJob(updated);
      setToast({ type: "success", message: "Job updated" });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to update job" });
    } finally {
      setSavingJob(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!window.confirm("Delete this job posting?")) return;
    try {
      setDeletingJobId(jobId);
      const response = await fetch(`${API_BASE_URL}/api/recruiter/jobs/${jobId}`, { method: "DELETE", headers: authHeaders() });
      if (!response.ok) throw new Error("Unable to delete job");
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
      if (selectedJob?._id === jobId) { setSelectedJob(null); setEditJobForm(null); }
      setToast({ type: "success", message: "Job deleted" });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to delete job" });
    } finally {
      setDeletingJobId(null);
    }
  };

  const updateInterviewStatus = async (interviewId: string, nextStatus: InterviewRecord["status"]) => {
    try {
      setUpdatingInterviewId(interviewId);
      const response = await fetch(`${API_BASE_URL}/api/recruiter/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error("Unable to update interview");
      const updated = (await response.json()) as InterviewRecord;
      setInterviews((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
      setToast({ type: "success", message: `Interview ${nextStatus.toLowerCase()}` });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to update interview" });
    } finally {
      setUpdatingInterviewId(null);
    }
  };

  const findTopCandidates = async (jobId: string) => {
    try {
      setRankingJobId(jobId);
      setRankingResult(null);
      setShowRankingModal(true);
      const response = await fetch(`${API_BASE_URL}/api/recruiter/jobs/${jobId}/top-candidates`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!response.ok) {
        const d = await response.json().catch(() => null);
        throw new Error(d?.detail || "Unable to rank candidates");
      }
      const data = (await response.json()) as RankingResult;
      setRankingResult(data);
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Ranking failed" });
      setShowRankingModal(false);
    } finally {
      setRankingJobId(null);
    }
  };

  const ongoingInterviews = useMemo(() => interviews.filter((i) => i.status === "ONGOING"), [interviews]);
  const closedInterviews = useMemo(() => interviews.filter((i) => i.status !== "ONGOING"), [interviews]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Loading...</div>;
  if (!user) return null;
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-white">
          <h1 className="text-2xl font-semibold">Recruiter access required</h1>
          <button onClick={() => router.push("/login")} className="mt-4 rounded-2xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">Back to login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full space-y-8 px-6 py-10 lg:px-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/recruiter" className="hover:text-white transition">Dashboard</Link>
          <span>/</span>
          <span className="text-white">Your Postings</span>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${toast.type === "success" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-rose-400/40 bg-rose-500/10 text-rose-100"}`}>
            {toast.message}
          </div>
        )}

        {/* Jobs List + Edit */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Job list */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Manage jobs</p>
                <h2 className="text-2xl font-semibold">Your postings</h2>
              </div>
              <button onClick={() => void loadJobs()} className="rounded-2xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">Refresh</button>
            </div>
            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {loadingJobs && jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 p-6 text-sm text-slate-300">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 p-6 text-sm text-slate-300">No jobs yet. <Link href="/recruiter" className="text-emerald-300 hover:underline">Post one →</Link></div>
              ) : (
                jobs.map((job) => (
                  <article
                    key={job._id}
                    className={`rounded-2xl border px-4 py-3 transition cursor-pointer ${selectedJob?._id === job._id ? "border-emerald-400/50 bg-emerald-400/5" : "border-white/10 bg-slate-950/40 hover:border-white/20"}`}
                    onClick={() => selectJob(job)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{job.title}</p>
                        <p className="text-xs text-slate-400">{job.location || "Location TBD"}</p>
                        <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${job.status === "OPEN" ? "bg-emerald-500/20 text-emerald-200" : job.status === "PAUSED" ? "bg-amber-500/20 text-amber-200" : "bg-slate-500/30 text-slate-100"}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); findTopCandidates(job._id); }}
                          disabled={rankingJobId === job._id}
                          className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 text-[11px] font-semibold text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-60"
                        >
                          {rankingJobId === job._id ? "Analyzing..." : "🏆 Top Candidates"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteJob(job._id); }}
                          disabled={deletingJobId === job._id}
                          className="rounded-xl border border-rose-400/50 px-3 py-1 text-[11px] text-rose-200 hover:bg-rose-500/10 disabled:opacity-70"
                        >
                          {deletingJobId === job._id ? "..." : "Remove"}
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-400">{job.description}</p>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* Edit panel */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Edit job</p>
                <h2 className="text-2xl font-semibold">Update posting</h2>
              </div>
              <button
                onClick={updateJob}
                disabled={!selectedJob || savingJob}
                className="rounded-2xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                {savingJob ? "Saving..." : "Save changes"}
              </button>
            </div>
            {selectedJob && editJobForm ? (
              <div className="mt-4 grid gap-4">
                <label className="text-sm text-slate-300">Title <input value={editJobForm.title} onChange={(e) => setEditJobForm({ ...editJobForm, title: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" /></label>
                <label className="text-sm text-slate-300">Description <textarea value={editJobForm.description} onChange={(e) => setEditJobForm({ ...editJobForm, description: e.target.value })} rows={5} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" /></label>
                <label className="text-sm text-slate-300">Required skills <input value={editJobForm.required_skills} onChange={(e) => setEditJobForm({ ...editJobForm, required_skills: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" /></label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-300">Location <input value={editJobForm.location} onChange={(e) => setEditJobForm({ ...editJobForm, location: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" /></label>
                  <label className="text-sm text-slate-300">Employment type <input value={editJobForm.employment_type} onChange={(e) => setEditJobForm({ ...editJobForm, employment_type: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" /></label>
                </div>
                <label className="text-sm text-slate-300">Status
                  <select value={editJobForm.status} onChange={(e) => setEditJobForm({ ...editJobForm, status: e.target.value as JobFormState["status"] })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white">
                    <option value="OPEN" className="bg-slate-900">OPEN</option>
                    <option value="PAUSED" className="bg-slate-900">PAUSED</option>
                    <option value="CLOSED" className="bg-slate-900">CLOSED</option>
                  </select>
                </label>
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-400">Select a job from the list to edit.</p>
            )}
          </div>
        </section>

        {/* Interview Pipeline */}
        <section id="interviews" className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Interview pipeline</p>
              <h2 className="text-2xl font-semibold">Ongoing &amp; closed loops</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-white/15 px-3 py-1 text-slate-200">{ongoingInterviews.length} ongoing</span>
              <span className="rounded-full border border-white/15 px-3 py-1 text-slate-200">{closedInterviews.length} closed</span>
              <button onClick={() => void loadInterviews()} className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Refresh</button>
            </div>
          </div>
          {loadingInterviews ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/20 p-6 text-sm text-slate-300">Loading...</div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ongoing</p>
                <div className="mt-4 space-y-4">
                  {ongoingInterviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">No active interviews.</div>
                  ) : ongoingInterviews.map((iv) => (
                    <article key={iv._id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{iv.job_title || "Untitled"}</p>
                          <p className="text-xs text-slate-400">{iv.candidate_name || iv.candidate_email}</p>
                        </div>
                        <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase text-emerald-100">ONGOING</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => updateInterviewStatus(iv._id, "COMPLETED")} disabled={updatingInterviewId === iv._id} className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:bg-slate-600">{updatingInterviewId === iv._id ? "..." : "Mark Completed"}</button>
                        <button onClick={() => updateInterviewStatus(iv._id, "CANCELLED")} disabled={updatingInterviewId === iv._id} className="flex-1 rounded-xl border border-rose-400/50 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/10 disabled:opacity-60">{updatingInterviewId === iv._id ? "..." : "Cancel"}</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Completed &amp; Cancelled</p>
                <div className="mt-4 space-y-4">
                  {closedInterviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">No closed interviews.</div>
                  ) : closedInterviews.map((iv) => (
                    <article key={iv._id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{iv.job_title || "Untitled"}</p>
                          <p className="text-xs text-slate-400">{iv.candidate_name || iv.candidate_email}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase ${iv.status === "COMPLETED" ? "border-blue-400/50 bg-blue-500/10 text-blue-100" : "border-rose-400/50 bg-rose-500/10 text-rose-100"}`}>{iv.status}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* AI Top Candidates Ranking Modal */}
      {showRankingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8" onClick={(e) => { if (e.target === e.currentTarget) setShowRankingModal(false); }}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-purple-200">AI Analysis</p>
                <h3 className="mt-1 text-2xl font-semibold text-white">
                  🏆 Top Candidates {rankingResult?.job_title ? `for "${rankingResult.job_title}"` : ""}
                </h3>
                {rankingResult?.ai_note && <p className="mt-1 text-xs text-amber-200">{rankingResult.ai_note}</p>}
              </div>
              <button onClick={() => setShowRankingModal(false)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/10">Close</button>
            </div>

            {!rankingResult ? (
              <div className="mt-8 flex flex-col items-center gap-4 py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                <p className="text-sm text-slate-300">AI is analyzing candidates... This may take a moment.</p>
              </div>
            ) : rankingResult.message && rankingResult.ranked_candidates.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-300">
                {rankingResult.message}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {rankingResult.ranked_candidates.map((candidate, idx) => (
                  <article key={candidate.email} className={`rounded-2xl border p-5 ${idx === 0 ? "border-yellow-400/50 bg-yellow-500/5" : idx === 1 ? "border-slate-300/40 bg-slate-300/5" : idx === 2 ? "border-amber-600/40 bg-amber-600/5" : "border-white/10 bg-slate-950/40"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${idx === 0 ? "bg-yellow-500 text-black" : idx === 1 ? "bg-slate-300 text-black" : idx === 2 ? "bg-amber-600 text-white" : "bg-slate-700 text-white"}`}>
                          #{candidate.rank}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{candidate.name || candidate.email}</p>
                          <p className="text-xs text-slate-400">{candidate.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{candidate.score}<span className="text-sm text-slate-400">/100</span></p>
                        <p className="text-[11px] uppercase tracking-wider text-slate-400">Match Score</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-200">{candidate.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-4">
                      {candidate.strengths.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-emerald-300">Strengths</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {candidate.strengths.map((s) => (
                              <span key={s} className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-100">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {candidate.gaps.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-rose-300">Gaps</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {candidate.gaps.map((g) => (
                              <span key={g} className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] text-rose-100">{g}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
