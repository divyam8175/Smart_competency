"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getCandidates } from "@/lib/api";

type Candidate = {
  _id: string;
  full_name: string;
  email: string;
  job_role: string;
  extracted_skills: Array<{ name: string; category: string; confidence: number }>;
  ollama_summary: string | null;
  created_at: string;
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && user.role !== "ADMIN") {
      router.push("/profile");
      return;
    }
    
    if (user && user.role === "ADMIN") {
      fetchCandidates();
    }
  }, [user, authLoading, router]);

  const fetchCandidates = async () => {
    try {
      const data = await getCandidates();
      setCandidates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-300">Loading candidates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (user && user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-300">Access restricted to admins.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-6 py-12 lg:px-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-white">All Candidates</h1>
        <a
          href="/"
          className="rounded-lg bg-accent px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-300"
        >
          ← Back to Form
        </a>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-xl bg-slate-900/70 p-12 text-center">
          <p className="text-lg text-slate-400">No candidates yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {candidates.map((candidate) => (
            <div
              key={candidate._id}
              className="rounded-xl bg-slate-900/70 p-6 shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {candidate.full_name}
                  </h2>
                  <p className="text-sm text-slate-400">{candidate.email}</p>
                  <p className="mt-1 text-sm text-accent">{candidate.job_role}</p>
                </div>
                <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">
                  {new Date(candidate.created_at).toLocaleDateString()}
                </span>
              </div>

              {candidate.extracted_skills.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-medium text-slate-300">
                    Extracted Skills ({candidate.extracted_skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.extracted_skills.slice(0, 10).map((skill, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300"
                      >
                        {skill.name} ({(skill.confidence * 100).toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {candidate.ollama_summary && (
                <div className="rounded-lg bg-slate-800/50 p-4">
                  <h3 className="mb-2 text-sm font-medium text-glow">
                    🧠 Ollama Insights
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-300">
                    {candidate.ollama_summary}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
