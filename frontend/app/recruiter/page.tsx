"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type JobFormState = {
  title: string;
  description: string;
  required_skills: string;
  location: string;
  employment_type: string;
  status: "OPEN" | "PAUSED" | "CLOSED";
};

const createEmptyJobForm = (): JobFormState => ({
  title: "",
  description: "",
  required_skills: "",
  location: "",
  employment_type: "",
  status: "OPEN",
});

export default function RecruiterPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [newJobForm, setNewJobForm] = useState<JobFormState>(() => createEmptyJobForm());
  const [creatingJob, setCreatingJob] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [recentJobsCount, setRecentJobsCount] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "RECRUITER" && user.role !== "ADMIN") return;
    void loadJobCount();
  }, [isLoading, user, router]);

  const hasAccess = user && (user.role === "RECRUITER" || user.role === "ADMIN");

  const authHeaders = () => {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` } as Record<string, string>;
  };

  const parseSkills = (value: string) =>
    value.split(",").map((s) => s.trim()).filter(Boolean);

  const loadJobCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recruiter/jobs`, { headers: authHeaders() });
      if (response.ok) {
        const data = await response.json();
        setRecentJobsCount(Array.isArray(data) ? data.length : 0);
      }
    } catch { /* ignore */ }
  };

  const createJob = async () => {
    if (!newJobForm.title.trim() || !newJobForm.description.trim()) {
      setToast({ type: "error", message: "Title and description are required" });
      return;
    }
    try {
      setCreatingJob(true);
      const payload = {
        title: newJobForm.title.trim(),
        description: newJobForm.description.trim(),
        required_skills: parseSkills(newJobForm.required_skills),
        location: newJobForm.location.trim() || undefined,
        employment_type: newJobForm.employment_type.trim() || undefined,
        status: newJobForm.status,
      };
      const response = await fetch(`${API_BASE_URL}/api/recruiter/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || "Unable to create job");
      }
      setNewJobForm(createEmptyJobForm());
      setRecentJobsCount((prev) => prev + 1);
      setToast({ type: "success", message: "Job posted successfully!" });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to create job" });
    } finally {
      setCreatingJob(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Preparing recruiter desk...
      </div>
    );
  }

  if (!user) return null;

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-300">Restricted</p>
          <h1 className="mt-3 text-3xl font-semibold">Recruiter access required</h1>
          <p className="mt-3 text-slate-300">Please sign in with a recruiter account to manage openings and candidates.</p>
          <button onClick={() => router.push("/login")} className="mt-6 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full space-y-8 px-6 py-10 lg:px-12">
        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-blue-900/30 p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Recruiter workspace</p>
              <h1 className="mt-2 text-3xl font-semibold">Post a new job opening</h1>
              <p className="text-sm text-slate-200">Create compelling job listings to attract top talent.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">
              Logged in as {user.email}
            </div>
          </div>

          {/* Quick nav cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Link href="/recruiter/postings" className="group rounded-2xl border border-white/15 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-5 transition hover:border-emerald-400/40">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Your postings</p>
              <p className="mt-2 text-2xl font-semibold text-white">{recentJobsCount}</p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-200 group-hover:text-emerald-100">View &amp; manage jobs →</p>
            </Link>
            <Link href="/recruiter/candidates" className="group rounded-2xl border border-white/15 bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-5 transition hover:border-blue-400/40">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Candidates</p>
              <p className="mt-2 text-2xl font-semibold text-white">Explore</p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-blue-200 group-hover:text-blue-100">Search &amp; invite →</p>
            </Link>
            <Link href="/recruiter/postings#interviews" className="group rounded-2xl border border-white/15 bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-5 transition hover:border-purple-400/40">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Interviews</p>
              <p className="mt-2 text-2xl font-semibold text-white">Pipeline</p>
              <p className="text-[11px] uppercase tracking-[0.3em] text-purple-200 group-hover:text-purple-100">Track progress →</p>
            </Link>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${toast.type === "success" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-rose-400/40 bg-rose-500/10 text-rose-100"}`}>
            {toast.message}
          </div>
        )}

        {/* Job Posting Form - Full Width */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">New opening</p>
              <h2 className="text-2xl font-semibold">Share a new job</h2>
              <p className="mt-1 text-sm text-slate-400">Fill in the details below and hit post to publish your opening.</p>
            </div>
            <button
              onClick={createJob}
              disabled={creatingJob}
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {creatingJob ? "Posting..." : "Post job"}
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <label className="block text-sm text-slate-300">
                Job Title
                <input
                  value={newJobForm.title}
                  onChange={(e) => setNewJobForm({ ...newJobForm, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500"
                  placeholder="Senior Platform Engineer"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Required Skills
                <input
                  value={newJobForm.required_skills}
                  onChange={(e) => setNewJobForm({ ...newJobForm, required_skills: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500"
                  placeholder="Typescript, AWS, Kubernetes (comma separated)"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Location
                  <input
                    value={newJobForm.location}
                    onChange={(e) => setNewJobForm({ ...newJobForm, location: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500"
                    placeholder="Remote, NYC, etc"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Employment Type
                  <input
                    value={newJobForm.employment_type}
                    onChange={(e) => setNewJobForm({ ...newJobForm, employment_type: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500"
                    placeholder="Full-time"
                  />
                </label>
              </div>
              <label className="block text-sm text-slate-300">
                Status
                <select
                  value={newJobForm.status}
                  onChange={(e) => setNewJobForm({ ...newJobForm, status: e.target.value as JobFormState["status"] })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                >
                  <option value="OPEN" className="bg-slate-900">OPEN</option>
                  <option value="PAUSED" className="bg-slate-900">PAUSED</option>
                  <option value="CLOSED" className="bg-slate-900">CLOSED</option>
                </select>
              </label>
            </div>
            <div>
              <label className="block text-sm text-slate-300">
                Job Description
                <textarea
                  value={newJobForm.description}
                  onChange={(e) => setNewJobForm({ ...newJobForm, description: e.target.value })}
                  rows={12}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500"
                  placeholder="Responsibilities, ideal background, benefits, team culture..."
                />
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
