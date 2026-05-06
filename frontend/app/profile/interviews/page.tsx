"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type InterviewStatus = "ONGOING" | "COMPLETED" | "CANCELLED";

type InterviewRecord = {
  _id: string;
  job_id: string;
  job_title?: string;
  recruiter_email: string;
  recruiter_name?: string;
  status: InterviewStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

const statusCopy: Record<InterviewStatus, string> = {
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<InterviewStatus, string> = {
  ONGOING: "border-emerald-400/50 bg-emerald-500/10 text-emerald-100",
  COMPLETED: "border-blue-400/40 bg-blue-500/10 text-blue-100",
  CANCELLED: "border-rose-400/40 bg-rose-500/10 text-rose-100",
};

export default function InterviewDeskPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [ongoing, setOngoing] = useState<InterviewRecord[]>([]);
  const [completed, setCompleted] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInterviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api/profile/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || "Unable to fetch interviews");
      }
      const data = (await response.json()) as InterviewRecord[];
      setOngoing(data.filter((record) => record.status === "ONGOING"));
      setCompleted(data.filter((record) => record.status !== "ONGOING"));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to fetch interviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "CANDIDATE") {
      router.push("/profile");
      return;
    }
    void loadInterviews();
  }, [isLoading, user, router, loadInterviews]);

  const totalCount = useMemo(() => ongoing.length + completed.length, [ongoing.length, completed.length]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full space-y-8 px-6 py-10 lg:px-12">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-blue-900/40 p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Interview tracker</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Stay on top of every conversation</h1>
              <p className="mt-2 text-sm text-slate-200">
                Accepted invites become ongoing interviews automatically. Completed or cancelled rounds stay archived for reference.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void loadInterviews()}
                className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Refresh
              </button>
              <Link
                href="/profile"
                className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to workspace
              </Link>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/15 px-3 py-1">
              {totalCount} interviews tracked
            </span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-100">
              {ongoing.length} ongoing
            </span>
            <span className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-blue-100">
              {completed.length} completed/cancelled
            </span>
          </div>
        </header>

        {error && <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-2">
          <InterviewColumn
            title="Ongoing"
            description="Interviews you have accepted and are currently in progress."
            emptyText="No active interviews yet. Accept an invite to kick things off."
            items={ongoing}
          />
          <InterviewColumn
            title="Completed & Closed"
            description="Wrap-ups, cancelled rounds, and final decisions stay here for reference."
            emptyText="Nothing completed yet."
            items={completed}
          />
        </div>

        {loading && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-slate-300">
            Loading interviews...
          </div>
        )}
      </div>
    </div>
  );
}

function InterviewColumn({
  title,
  description,
  emptyText,
  items,
}: {
  title: string;
  description: string;
  emptyText: string;
  items: InterviewRecord[];
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </div>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">{emptyText}</div>
        ) : (
          items.map((interview) => (
            <article key={interview._id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-white">{interview.job_title || "Untitled role"}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.3em] ${statusStyles[interview.status]}`}>
                    {statusCopy[interview.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Recruiter: {interview.recruiter_email}</p>
                <p className="text-xs text-slate-400">Started {new Date(interview.created_at).toLocaleString()}</p>
                {interview.completed_at && (
                  <p className="text-xs text-slate-500">Wrapped {new Date(interview.completed_at).toLocaleString()}</p>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
