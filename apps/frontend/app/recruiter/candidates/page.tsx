"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type CandidateProfile = {
  _id: string;
  email?: string;
  full_name?: string;
  current_role?: string;
  experience_years?: number;
  education?: string;
  skills?: string[];
  updated_at?: string;
};

type JobRecord = { _id: string; title: string; status: string };

type InvitationStatusType = "PENDING" | "VIEWED" | "ACCEPTED" | "DECLINED" | "CANCELLED";

type RecruiterInviteRecord = {
  _id: string;
  job_id: string;
  job_title?: string;
  candidate_email: string;
  candidate_name?: string;
  recruiter_email: string;
  message?: string;
  status: InvitationStatusType;
  created_at: string;
  updated_at: string;
};

type InterviewRecord = {
  _id: string;
  job_id: string;
  job_title?: string;
  candidate_email: string;
  candidate_name?: string;
  status: "ONGOING" | "COMPLETED" | "CANCELLED";
  created_at: string;
};

type CandidateFilterState = { search: string; skill: string; minExperience: string; maxExperience: string };

const createDefaultFilters = (): CandidateFilterState => ({ search: "", skill: "", minExperience: "", maxExperience: "" });

export default function RecruiterCandidatesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [candidateFilters, setCandidateFilters] = useState<CandidateFilterState>(() => createDefaultFilters());
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [sentInvites, setSentInvites] = useState<RecruiterInviteRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [inviteTarget, setInviteTarget] = useState<CandidateProfile | null>(null);
  const [inviteJobId, setInviteJobId] = useState<string>("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [withdrawingInviteId, setWithdrawingInviteId] = useState<string | null>(null);
  const [updatingInterviewId, setUpdatingInterviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "RECRUITER" && user.role !== "ADMIN") return;
    void loadCandidates();
    void loadJobs();
    void loadInvites();
    void loadInterviews();
  }, [isLoading, user, router]);

  const hasAccess = user && (user.role === "RECRUITER" || user.role === "ADMIN");

  const authHeaders = () => {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` } as Record<string, string>;
  };

  const loadJobs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/jobs`, { headers: authHeaders() });
      if (res.ok) setJobs(await res.json());
    } catch { /* ignore */ }
  };

  const loadInvites = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/invites`, { headers: authHeaders() });
      if (res.ok) setSentInvites(await res.json());
    } catch { /* ignore */ }
  };

  const loadInterviews = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/interviews`, { headers: authHeaders() });
      if (res.ok) setInterviews(await res.json());
    } catch { /* ignore */ }
  };

  const loadCandidates = async (filtersOverride?: CandidateFilterState) => {
    try {
      setLoadingCandidates(true);
      const f = filtersOverride ?? candidateFilters;
      const params = new URLSearchParams();
      if (f.search) params.append("search", f.search);
      if (f.skill) params.append("skill", f.skill);
      if (f.minExperience) params.append("min_experience", f.minExperience);
      if (f.maxExperience) params.append("max_experience", f.maxExperience);
      const query = params.toString();
      const res = await fetch(`${API_BASE_URL}/api/recruiter/candidates${query ? `?${query}` : ""}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Unable to load candidates");
      setCandidates(await res.json());
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load candidates" });
    } finally {
      setLoadingCandidates(false);
    }
  };

  const openInviteComposer = (candidate: CandidateProfile) => {
    if (!candidate.email) { setToast({ type: "error", message: "Candidate email required" }); return; }
    if (jobs.length === 0) { setToast({ type: "error", message: "Create a job before sending invites" }); return; }
    setInviteTarget(candidate);
    setInviteJobId(jobs[0]._id);
    const name = candidate.full_name?.split(" ")[0] ?? candidate.email;
    setInviteMessage(`Hi ${name}, I'd love to discuss a role with you.`);
  };

  const closeInviteComposer = () => { setInviteTarget(null); setInviteMessage(""); setInviteJobId(""); };

  const sendInvite = async () => {
    if (!inviteTarget?.email || !inviteJobId) { setToast({ type: "error", message: "Select a candidate and job" }); return; }
    try {
      setSendingInvite(true);
      const res = await fetch(`${API_BASE_URL}/api/recruiter/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ job_id: inviteJobId, candidate_email: inviteTarget.email, message: inviteMessage.trim() || undefined }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.detail || "Unable to send invite"); }
      const created = await res.json();
      setSentInvites((prev) => [created, ...prev.filter((i) => i._id !== created._id)]);
      setToast({ type: "success", message: "Invite sent!" });
      closeInviteComposer();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to send invite" });
    } finally {
      setSendingInvite(false);
    }
  };

  const withdrawInvite = async (inviteId: string) => {
    try {
      setWithdrawingInviteId(inviteId);
      const res = await fetch(`${API_BASE_URL}/api/recruiter/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) throw new Error("Unable to withdraw invite");
      const updated = await res.json();
      setSentInvites((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
      setToast({ type: "success", message: "Invite withdrawn" });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to withdraw" });
    } finally {
      setWithdrawingInviteId(null);
    }
  };

  const updateInterviewStatus = async (interviewId: string, nextStatus: "COMPLETED" | "CANCELLED") => {
    try {
      setUpdatingInterviewId(interviewId);
      const res = await fetch(`${API_BASE_URL}/api/recruiter/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Unable to update interview");
      const updated = await res.json();
      setInterviews((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
      setToast({ type: "success", message: `Interview ${nextStatus.toLowerCase()}` });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to update" });
    } finally {
      setUpdatingInterviewId(null);
    }
  };

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
          <span className="text-white">Candidates</span>
        </div>

        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-blue-900/30 p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Talent radar</p>
              <h1 className="mt-2 text-3xl font-semibold">Candidate Explorer</h1>
              <p className="text-sm text-slate-200">Search, filter, and manage candidates. Update interview statuses directly.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => void loadCandidates()} className="rounded-2xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">Apply filters</button>
              <button onClick={() => { setCandidateFilters(createDefaultFilters()); void loadCandidates(createDefaultFilters()); }} className="rounded-2xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">Reset</button>
            </div>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${toast.type === "success" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-rose-400/40 bg-rose-500/10 text-rose-100"}`}>
            {toast.message}
          </div>
        )}

        {/* Filters */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-slate-300">
              Keyword
              <input value={candidateFilters.search} onChange={(e) => setCandidateFilters({ ...candidateFilters, search: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" placeholder="Role, name, etc" />
            </label>
            <label className="text-xs text-slate-300">
              Skill focus
              <input value={candidateFilters.skill} onChange={(e) => setCandidateFilters({ ...candidateFilters, skill: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" placeholder="e.g. React" />
            </label>
            <label className="text-xs text-slate-300">
              Min experience
              <input value={candidateFilters.minExperience} onChange={(e) => setCandidateFilters({ ...candidateFilters, minExperience: e.target.value.replace(/[^0-9]/g, "") })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" placeholder="3" />
            </label>
            <label className="text-xs text-slate-300">
              Max experience
              <input value={candidateFilters.maxExperience} onChange={(e) => setCandidateFilters({ ...candidateFilters, maxExperience: e.target.value.replace(/[^0-9]/g, "") })} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white" placeholder="10" />
            </label>
          </div>
        </section>

        {/* Candidates Grid */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loadingCandidates ? (
            <div className="col-span-full rounded-2xl border border-dashed border-white/20 p-6 text-sm text-slate-300">Loading candidates...</div>
          ) : candidates.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-white/20 p-6 text-sm text-slate-300">No candidates match the current filters.</div>
          ) : (
            candidates.map((candidate) => {
              const invite = candidate.email ? sentInvites.find((i) => i.candidate_email === candidate.email) : undefined;
              const interview = candidate.email ? interviews.find((i) => i.candidate_email === candidate.email && i.status === "ONGOING") : undefined;
              const activeStatuses: InvitationStatusType[] = ["PENDING", "VIEWED"];
              const hasPending = Boolean(invite && activeStatuses.includes(invite.status));

              return (
                <article key={candidate._id} className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{candidate.full_name || candidate.email || "Candidate"}</p>
                      <p className="text-xs text-slate-400">{candidate.current_role || "Role not provided"}</p>
                    </div>
                    {candidate.experience_years !== undefined && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-200">{candidate.experience_years} yrs</span>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-slate-300 line-clamp-2">{candidate.education || "Education not listed"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(candidate.skills || []).slice(0, 6).map((skill) => (
                      <span key={skill} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-200">{skill}</span>
                    ))}
                  </div>
                  {candidate.updated_at && (
                    <p className="mt-3 text-[11px] text-slate-500">Updated {new Date(candidate.updated_at).toLocaleDateString()}</p>
                  )}

                  {/* Interview status controls */}
                  {interview ? (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-100">Interview ongoing</span>
                        {interview.job_title && <span className="ml-auto text-[11px] text-emerald-200">{interview.job_title}</span>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateInterviewStatus(interview._id, "COMPLETED")}
                          disabled={updatingInterviewId === interview._id}
                          className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:bg-slate-600"
                        >
                          {updatingInterviewId === interview._id ? "..." : "Mark Completed"}
                        </button>
                        <button
                          onClick={() => updateInterviewStatus(interview._id, "CANCELLED")}
                          disabled={updatingInterviewId === interview._id}
                          className="flex-1 rounded-xl border border-rose-400/50 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/10 disabled:opacity-60"
                        >
                          {updatingInterviewId === interview._id ? "..." : "Revoke / Cancel"}
                        </button>
                      </div>
                    </div>
                  ) : hasPending ? (
                    <button
                      onClick={() => invite && withdrawInvite(invite._id)}
                      disabled={!invite || withdrawingInviteId === invite?._id}
                      className="mt-4 w-full rounded-2xl border border-rose-400/60 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {withdrawingInviteId === invite?._id ? "Withdrawing..." : "Withdraw invite"}
                    </button>
                  ) : (
                    <button
                      onClick={() => openInviteComposer(candidate)}
                      disabled={!candidate.email}
                      className="mt-4 w-full rounded-2xl border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {candidate.email ? "Invite to role" : "Email missing"}
                    </button>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>

      {/* Invite Modal */}
      {inviteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Invite candidate</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{inviteTarget.full_name || inviteTarget.email}</h3>
                <p className="text-sm text-slate-300">{inviteTarget.current_role || inviteTarget.skills?.slice(0, 3).join(", ") || "Role not provided"}</p>
              </div>
              <button onClick={closeInviteComposer} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/10">Close</button>
            </div>
            <label className="mt-6 block text-sm text-slate-300">
              Attach job
              <select value={inviteJobId} onChange={(e) => setInviteJobId(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white">
                {jobs.map((job) => (<option key={job._id} value={job._id} className="bg-slate-900 text-white">{job.title} - {job.status}</option>))}
              </select>
            </label>
            <label className="mt-4 block text-sm text-slate-300">
              Message (optional)
              <textarea value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white" placeholder="Share context, timelines, next steps" />
            </label>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={sendInvite} disabled={sendingInvite} className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:bg-slate-600">{sendingInvite ? "Sending..." : "Send invite"}</button>
              <button onClick={closeInviteComposer} className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
