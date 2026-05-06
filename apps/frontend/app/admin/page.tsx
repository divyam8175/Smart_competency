"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type CandidateAdminRecord = {
  _id: string;
  email: string;
  full_name?: string;
  phone?: string;
  current_role?: string;
  experience_years?: number;
  education?: string;
  skills?: string[];
  updated_at?: string;
  user?: {
    _id?: string;
    full_name?: string;
    role?: string;
    is_active?: boolean;
  };
};

type RecruiterAdminRecord = {
  _id: string;
  email: string;
  full_name?: string;
  company?: string;
  phone?: string;
  notes?: string;
  role: "RECRUITER";
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type CandidateFormState = {
  candidateId: string;
  full_name: string;
  current_role: string;
  experience_years: string;
  education: string;
  phone: string;
  skills: string;
};

type RecruiterFormState = {
  recruiterId: string;
  full_name: string;
  company: string;
  phone: string;
  notes: string;
};

type NewCandidateFormState = {
  email: string;
  full_name: string;
  current_role: string;
  experience_years: string;
  phone: string;
  skills: string;
};

type NewRecruiterFormState = {
  full_name: string;
  email: string;
  password: string;
  company: string;
  phone: string;
  notes: string;
};

const createEmptyCandidateForm = (): NewCandidateFormState => ({
  email: "",
  full_name: "",
  current_role: "",
  experience_years: "",
  phone: "",
  skills: "",
});

const createEmptyRecruiterForm = (): NewRecruiterFormState => ({
  full_name: "",
  email: "",
  password: "",
  company: "",
  phone: "",
  notes: "",
});

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"candidates" | "recruiters">("candidates");
  const [candidates, setCandidates] = useState<CandidateAdminRecord[]>([]);
  const [recruiters, setRecruiters] = useState<RecruiterAdminRecord[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateAdminRecord | null>(null);
  const [selectedRecruiter, setSelectedRecruiter] = useState<RecruiterAdminRecord | null>(null);
  const [candidateForm, setCandidateForm] = useState<CandidateFormState | null>(null);
  const [recruiterForm, setRecruiterForm] = useState<RecruiterFormState | null>(null);
  const [candidateFilter, setCandidateFilter] = useState("");
  const [recruiterFilter, setRecruiterFilter] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [newCandidateForm, setNewCandidateForm] = useState<NewCandidateFormState>(() => createEmptyCandidateForm());
  const [newRecruiterForm, setNewRecruiterForm] = useState<NewRecruiterFormState>(() => createEmptyRecruiterForm());
  const [creatingCandidate, setCreatingCandidate] = useState(false);
  const [creatingRecruiter, setCreatingRecruiter] = useState(false);
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  const [deletingRecruiterId, setDeletingRecruiterId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    void loadAdminData();
  }, [authLoading, user, router]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const headers = { Authorization: `Bearer ${token}` };
      const [candidateRes, recruiterRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/candidates`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/recruiters`, { headers }),
      ]);

      if (!candidateRes.ok || !recruiterRes.ok) {
        const detail = (!candidateRes.ok && (await candidateRes.json().catch(() => null))?.detail) ||
          (!recruiterRes.ok && (await recruiterRes.json().catch(() => null))?.detail) ||
          "Unable to load admin data";
        throw new Error(detail);
      }

      const [candidateData, recruiterData] = await Promise.all([
        candidateRes.json() as Promise<CandidateAdminRecord[]>,
        recruiterRes.json() as Promise<RecruiterAdminRecord[]>,
      ]);

      setCandidates(candidateData);
      setRecruiters(recruiterData);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load admin workspace");
    } finally {
      setLoading(false);
    }
  };

  const selectCandidate = (record: CandidateAdminRecord) => {
    setSelectedCandidate(record);
    setCandidateForm({
      candidateId: record._id,
      full_name: record.full_name ?? "",
      current_role: record.current_role ?? "",
      experience_years: record.experience_years?.toString() ?? "",
      education: record.education ?? "",
      phone: record.phone ?? "",
      skills: (record.skills ?? []).join(", "),
    });
  };

  const selectRecruiter = (record: RecruiterAdminRecord) => {
    setSelectedRecruiter(record);
    setRecruiterForm({
      recruiterId: record._id,
      full_name: record.full_name ?? "",
      company: record.company ?? "",
      phone: record.phone ?? "",
      notes: record.notes ?? "",
    });
  };

  const filteredCandidates = useMemo(() => {
    if (!candidateFilter.trim()) return candidates;
    const query = candidateFilter.toLowerCase();
    return candidates.filter((candidate) => {
      return (
        candidate.email.toLowerCase().includes(query) ||
        (candidate.full_name ?? "").toLowerCase().includes(query) ||
        (candidate.current_role ?? "").toLowerCase().includes(query)
      );
    });
  }, [candidateFilter, candidates]);

  const filteredRecruiters = useMemo(() => {
    if (!recruiterFilter.trim()) return recruiters;
    const query = recruiterFilter.toLowerCase();
    return recruiters.filter((recruiter) => {
      return (
        recruiter.email.toLowerCase().includes(query) ||
        (recruiter.full_name ?? "").toLowerCase().includes(query) ||
        (recruiter.company ?? "").toLowerCase().includes(query)
      );
    });
  }, [recruiterFilter, recruiters]);

  const candidateStats = useMemo(() => {
    const activeLinked = candidates.filter((c) => c.user?.is_active !== false).length;
    const inactive = candidates.length - activeLinked;
    return {
      total: candidates.length,
      active: activeLinked,
      inactive,
    };
  }, [candidates]);

  const recruiterStats = useMemo(() => {
    const active = recruiters.filter((r) => r.is_active !== false).length;
    return {
      total: recruiters.length,
      active,
      inactive: recruiters.length - active,
    };
  }, [recruiters]);

  const toggleUserStatus = async (userId: string | undefined, nextStatus: boolean) => {
    if (!userId) {
      setToast({ type: "error", message: "No linked account found." });
      return;
    }
    try {
      setIsSaving(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || "Status update failed");
      }
      const updatedAccount = await response.json();
      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate.user?._id === updatedAccount._id
            ? { ...candidate, user: { ...candidate.user, is_active: updatedAccount.is_active } }
            : candidate
        )
      );
      setRecruiters((prev) =>
        prev.map((recruiter) =>
          recruiter._id === updatedAccount._id ? { ...recruiter, is_active: updatedAccount.is_active } : recruiter
        )
      );
      setSelectedCandidate((prev) =>
        prev && prev.user?._id === updatedAccount._id
          ? { ...prev, user: { ...prev.user, is_active: updatedAccount.is_active } }
          : prev
      );
      setSelectedRecruiter((prev) =>
        prev && prev._id === updatedAccount._id ? { ...prev, is_active: updatedAccount.is_active } : prev
      );
      setToast({ type: "success", message: "Status updated" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Status update failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const saveCandidate = async () => {
    if (!candidateForm) return;
    try {
      setIsSaving(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const payload = {
        full_name: candidateForm.full_name || undefined,
        current_role: candidateForm.current_role || undefined,
        experience_years: candidateForm.experience_years ? Number(candidateForm.experience_years) : undefined,
        education: candidateForm.education || undefined,
        phone: candidateForm.phone || undefined,
        skills: candidateForm.skills
          ? candidateForm.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
          : undefined,
      };

      const response = await fetch(`${API_BASE_URL}/api/admin/candidates/${candidateForm.candidateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || "Failed to update candidate");
      }

      const updatedCandidate = (await response.json()) as CandidateAdminRecord;
      setCandidates((prev) => prev.map((record) => (record._id === updatedCandidate._id ? updatedCandidate : record)));
      setSelectedCandidate(updatedCandidate);
      setCandidateForm({
        candidateId: updatedCandidate._id,
        full_name: updatedCandidate.full_name ?? "",
        current_role: updatedCandidate.current_role ?? "",
        experience_years: updatedCandidate.experience_years?.toString() ?? "",
        education: updatedCandidate.education ?? "",
        phone: updatedCandidate.phone ?? "",
        skills: (updatedCandidate.skills ?? []).join(", "),
      });
      setToast({ type: "success", message: "Candidate profile updated" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to save candidate" });
    } finally {
      setIsSaving(false);
    }
  };

  const saveRecruiter = async () => {
    if (!recruiterForm) return;
    try {
      setIsSaving(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const payload = {
        full_name: recruiterForm.full_name || undefined,
        company: recruiterForm.company || undefined,
        phone: recruiterForm.phone || undefined,
        notes: recruiterForm.notes || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/api/admin/recruiters/${recruiterForm.recruiterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || "Failed to update recruiter");
      }

      const updatedRecruiter = (await response.json()) as RecruiterAdminRecord;
      setRecruiters((prev) => prev.map((record) => (record._id === updatedRecruiter._id ? updatedRecruiter : record)));
      setSelectedRecruiter(updatedRecruiter);
      setRecruiterForm({
        recruiterId: updatedRecruiter._id,
        full_name: updatedRecruiter.full_name ?? "",
        company: updatedRecruiter.company ?? "",
        phone: updatedRecruiter.phone ?? "",
        notes: updatedRecruiter.notes ?? "",
      });
      setToast({ type: "success", message: "Recruiter profile updated" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to save recruiter" });
    } finally {
      setIsSaving(false);
    }
  };

  const createCandidateProfile = async () => {
    if (!newCandidateForm.email.trim()) {
      setToast({ type: "error", message: "Email is required to create a candidate" });
      return;
    }
    try {
      setCreatingCandidate(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const payload = {
        email: newCandidateForm.email.trim(),
        full_name: newCandidateForm.full_name.trim() || undefined,
        current_role: newCandidateForm.current_role.trim() || undefined,
        experience_years: newCandidateForm.experience_years ? Number(newCandidateForm.experience_years) : undefined,
        phone: newCandidateForm.phone.trim() || undefined,
        skills: newCandidateForm.skills
          ? newCandidateForm.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
          : undefined,
      };
      const response = await fetch(`${API_BASE_URL}/api/admin/candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || "Failed to create candidate");
      }
      const created = (await response.json()) as CandidateAdminRecord;
      setCandidates((prev) => [created, ...prev]);
      setNewCandidateForm(createEmptyCandidateForm());
      setToast({ type: "success", message: "Candidate profile created" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to create candidate" });
    } finally {
      setCreatingCandidate(false);
    }
  };

  const createRecruiterAccount = async () => {
    if (!newRecruiterForm.email.trim() || !newRecruiterForm.full_name.trim() || !newRecruiterForm.password.trim()) {
      setToast({ type: "error", message: "Full name, email, and temporary password are required" });
      return;
    }
    try {
      setCreatingRecruiter(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const payload = {
        email: newRecruiterForm.email.trim(),
        full_name: newRecruiterForm.full_name.trim(),
        password: newRecruiterForm.password,
        company: newRecruiterForm.company.trim() || undefined,
        phone: newRecruiterForm.phone.trim() || undefined,
        notes: newRecruiterForm.notes.trim() || undefined,
      };
      const response = await fetch(`${API_BASE_URL}/api/admin/recruiters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || "Failed to create recruiter");
      }
      const created = (await response.json()) as RecruiterAdminRecord;
      setRecruiters((prev) => [created, ...prev]);
      setNewRecruiterForm(createEmptyRecruiterForm());
      setToast({ type: "success", message: "Recruiter account created" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to create recruiter" });
    } finally {
      setCreatingRecruiter(false);
    }
  };

  const deleteCandidateProfile = async (candidateId: string) => {
    if (!candidateId) return;
    const confirmed = typeof window === "undefined" ? true : window.confirm("Remove this candidate profile?");
    if (!confirmed) return;
    try {
      setDeletingCandidateId(candidateId);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`${API_BASE_URL}/api/admin/candidates/${candidateId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || "Failed to delete candidate");
      }
      setCandidates((prev) => prev.filter((candidate) => candidate._id !== candidateId));
      setSelectedCandidate((prev) => (prev && prev._id === candidateId ? null : prev));
      setCandidateForm((prev) => (prev && prev.candidateId === candidateId ? null : prev));
      setToast({ type: "success", message: "Candidate deleted" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to delete candidate" });
    } finally {
      setDeletingCandidateId(null);
    }
  };

  const deleteRecruiterAccount = async (recruiterId: string) => {
    if (!recruiterId) return;
    const confirmed = typeof window === "undefined" ? true : window.confirm("Remove this recruiter and jobs?");
    if (!confirmed) return;
    try {
      setDeletingRecruiterId(recruiterId);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`${API_BASE_URL}/api/admin/recruiters/${recruiterId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.detail || "Failed to delete recruiter");
      }
      setRecruiters((prev) => prev.filter((recruiter) => recruiter._id !== recruiterId));
      setSelectedRecruiter((prev) => (prev && prev._id === recruiterId ? null : prev));
      setRecruiterForm((prev) => (prev && prev.recruiterId === recruiterId ? null : prev));
      setToast({ type: "success", message: "Recruiter deleted" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to delete recruiter" });
    } finally {
      setDeletingRecruiterId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading admin console...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Restricted</p>
          <h1 className="mt-3 text-3xl font-semibold">Admin access required</h1>
          <p className="mt-3 text-slate-300">Switch to an administrator account to manage candidates and recruiters.</p>
          <button
            onClick={() => router.push("/profile")}
            className="mt-6 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Return to workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950/40 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-purple-200">Admin control</p>
              <h1 className="mt-2 text-3xl font-semibold">Talent operations cockpit</h1>
              <p className="text-sm text-slate-200">Track candidate readiness, keep recruiter accounts current, and control access from one place.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">
              {new Date().toLocaleString()}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab("candidates")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "candidates" ? "bg-white text-slate-900" : "border border-white/20 text-white hover:bg-white/10"
              }`}
            >
              Candidate profiles
            </button>
            <button
              onClick={() => setActiveTab("recruiters")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "recruiters" ? "bg-white text-slate-900" : "border border-white/20 text-white hover:bg-white/10"
              }`}
            >
              Recruiter accounts
            </button>
            <button
              onClick={loadAdminData}
              className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Refresh data
            </button>
          </div>
        </header>

        {toast && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                : "border-rose-400/40 bg-rose-500/10 text-rose-100"
            }`}
          >
            {toast.message}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {activeTab === "candidates" ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pipeline health</p>
                  <h2 className="text-2xl font-semibold">Candidate roster</h2>
                </div>
                <input
                  value={candidateFilter}
                  onChange={(event) => setCandidateFilter(event.target.value)}
                  placeholder="Search by name, email, or role"
                  className="w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-2 text-sm text-white placeholder:text-slate-400 md:w-60"
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <AdminStat label="Profiles" value={candidateStats.total} caption="Total candidates" />
                <AdminStat label="Linked & active" value={candidateStats.active} caption="Account enabled" />
                <AdminStat label="Flagged" value={candidateStats.inactive} caption="Account inactive" />
              </div>
              <div className="mt-6">
                <NewCandidateForm
                  formState={newCandidateForm}
                  onChange={setNewCandidateForm}
                  onSubmit={createCandidateProfile}
                  isSubmitting={creatingCandidate}
                />
              </div>
              <div className="mt-6 space-y-4">
                {filteredCandidates.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/20 bg-slate-900/50 p-6 text-sm text-slate-300">
                    No candidates match this filter.
                  </p>
                ) : (
                  filteredCandidates.map((candidate) => (
                    <CandidateCard
                      key={candidate._id}
                      candidate={candidate}
                      onSelect={selectCandidate}
                      onToggleStatus={toggleUserStatus}
                      isSelected={selectedCandidate?._id === candidate._id}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Profile controls</p>
              <h3 className="text-xl font-semibold text-white">{selectedCandidate ? "Edit candidate" : "Select a candidate"}</h3>
              {selectedCandidate && candidateForm ? (
                <CandidateEditor
                  formState={candidateForm}
                  onChange={setCandidateForm}
                  onSave={saveCandidate}
                  isSaving={isSaving}
                  linkedAccount={selectedCandidate.user}
                  onToggleStatus={toggleUserStatus}
                  onDelete={deleteCandidateProfile}
                  deletingCandidateId={deletingCandidateId}
                />
              ) : (
                <p className="mt-6 text-sm text-slate-400">Choose a candidate on the left to view or edit their profile.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recruiter network</p>
                  <h2 className="text-2xl font-semibold">Partner profiles</h2>
                </div>
                <input
                  value={recruiterFilter}
                  onChange={(event) => setRecruiterFilter(event.target.value)}
                  placeholder="Search recruiters"
                  className="w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-2 text-sm text-white placeholder:text-slate-400 md:w-60"
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <AdminStat label="Partners" value={recruiterStats.total} caption="Total recruiters" />
                <AdminStat label="Active" value={recruiterStats.active} caption="Enabled" />
                <AdminStat label="Inactive" value={recruiterStats.inactive} caption="Suspended" />
              </div>
              <div className="mt-6">
                <NewRecruiterForm
                  formState={newRecruiterForm}
                  onChange={setNewRecruiterForm}
                  onSubmit={createRecruiterAccount}
                  isSubmitting={creatingRecruiter}
                />
              </div>
              <div className="mt-6 space-y-4">
                {filteredRecruiters.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/20 bg-slate-900/50 p-6 text-sm text-slate-300">
                    No recruiters match this search.
                  </p>
                ) : (
                  filteredRecruiters.map((recruiter) => (
                    <RecruiterCard
                      key={recruiter._id}
                      recruiter={recruiter}
                      onSelect={selectRecruiter}
                      onToggleStatus={toggleUserStatus}
                      isSelected={selectedRecruiter?._id === recruiter._id}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recruiter controls</p>
              <h3 className="text-xl font-semibold text-white">{selectedRecruiter ? "Edit recruiter" : "Select a recruiter"}</h3>
              {selectedRecruiter && recruiterForm ? (
                <RecruiterEditor
                  formState={recruiterForm}
                  onChange={setRecruiterForm}
                  onSave={saveRecruiter}
                  isSaving={isSaving}
                  recruiter={selectedRecruiter}
                  onToggleStatus={toggleUserStatus}
                  onDelete={deleteRecruiterAccount}
                  deletingRecruiterId={deletingRecruiterId}
                />
              ) : (
                <p className="mt-6 text-sm text-slate-400">Pick a recruiter on the left to edit contact details or suspend access.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AdminStat({ label, value, caption }: { label: string; value: number; caption: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{caption}</p>
    </div>
  );
}

function NewCandidateForm({
  formState,
  onChange,
  onSubmit,
  isSubmitting,
}: {
  formState: NewCandidateFormState;
  onChange: (state: NewCandidateFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const handleFieldChange = (field: keyof NewCandidateFormState, value: string) => {
    onChange({ ...formState, [field]: value });
  };

  return (
    <div className="rounded-2xl border border-dashed border-white/20 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Add candidate</p>
      <h4 className="text-lg font-semibold text-white">Create profile shell</h4>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-300">
          Email *
          <input
            value={formState.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="candidate@company.com"
          />
        </label>
        <label className="text-xs text-slate-300">
          Full name
          <input
            value={formState.full_name}
            onChange={(event) => handleFieldChange("full_name", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="Jordan Rivera"
          />
        </label>
        <label className="text-xs text-slate-300">
          Current role
          <input
            value={formState.current_role}
            onChange={(event) => handleFieldChange("current_role", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="Senior Backend Engineer"
          />
        </label>
        <label className="text-xs text-slate-300">
          Experience (years)
          <input
            value={formState.experience_years}
            onChange={(event) => handleFieldChange("experience_years", event.target.value.replace(/[^0-9.]/g, ""))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="6"
          />
        </label>
        <label className="text-xs text-slate-300">
          Phone
          <input
            value={formState.phone}
            onChange={(event) => handleFieldChange("phone", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-slate-300 md:col-span-2">
          Skills (comma separated)
          <textarea
            value={formState.skills}
            onChange={(event) => handleFieldChange("skills", event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="Python, Distributed Systems, AWS"
          />
        </label>
      </div>
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {isSubmitting ? "Creating..." : "Create candidate profile"}
      </button>
    </div>
  );
}

function NewRecruiterForm({
  formState,
  onChange,
  onSubmit,
  isSubmitting,
}: {
  formState: NewRecruiterFormState;
  onChange: (state: NewRecruiterFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const handleFieldChange = (field: keyof NewRecruiterFormState, value: string) => {
    onChange({ ...formState, [field]: value });
  };

  return (
    <div className="rounded-2xl border border-dashed border-white/20 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Invite recruiter</p>
      <h4 className="text-lg font-semibold text-white">Provision account</h4>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-300">
          Full name *
          <input
            value={formState.full_name}
            onChange={(event) => handleFieldChange("full_name", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="Alexei Chen"
          />
        </label>
        <label className="text-xs text-slate-300">
          Email *
          <input
            value={formState.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="recruiter@agency.com"
          />
        </label>
        <label className="text-xs text-slate-300">
          Temporary password *
          <input
            type="password"
            value={formState.password}
            onChange={(event) => handleFieldChange("password", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="One-time password"
          />
        </label>
        <label className="text-xs text-slate-300">
          Company
          <input
            value={formState.company}
            onChange={(event) => handleFieldChange("company", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-slate-300">
          Phone
          <input
            value={formState.phone}
            onChange={(event) => handleFieldChange("phone", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-slate-300 md:col-span-2">
          Notes
          <textarea
            value={formState.notes}
            onChange={(event) => handleFieldChange("notes", event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
            placeholder="Preferred industries, intro message, etc."
          />
        </label>
      </div>
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="mt-4 w-full rounded-2xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {isSubmitting ? "Creating..." : "Create recruiter account"}
      </button>
    </div>
  );
}

function CandidateCard({
  candidate,
  onSelect,
  onToggleStatus,
  isSelected,
}: {
  candidate: CandidateAdminRecord;
  onSelect: (candidate: CandidateAdminRecord) => void;
  onToggleStatus: (userId: string | undefined, nextStatus: boolean) => void;
  isSelected: boolean;
}) {
  const linkedStatus = candidate.user?.is_active === false ? "Inactive" : candidate.user ? "Active" : "Unlinked";
  const linkedColor =
    candidate.user?.is_active === false ? "text-rose-300" : candidate.user ? "text-emerald-300" : "text-slate-400";

  return (
    <article
      className={`rounded-3xl border px-4 py-4 transition ${
        isSelected ? "border-emerald-400/60 bg-emerald-400/5" : "border-white/10 bg-slate-900/60"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{candidate.full_name || candidate.email}</p>
          <p className="text-xs text-slate-400">{candidate.current_role || "Role unknown"}</p>
          <p className={`text-xs ${linkedColor}`}>{linkedStatus}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {candidate.user && (
            <button
              onClick={() => onToggleStatus(candidate.user?._id, candidate.user?.is_active === false)}
              className="rounded-xl border border-white/15 px-3 py-1 text-xs text-white hover:bg-white/10"
            >
              {candidate.user?.is_active === false ? "Activate" : "Disable"}
            </button>
          )}
          <button
            onClick={() => onSelect(candidate)}
            className="rounded-xl bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-white"
          >
            Manage
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
        <span>{candidate.skills?.length ?? 0} skills</span>
        {candidate.experience_years !== undefined && <span>{candidate.experience_years} yrs exp</span>}
        {candidate.updated_at && <span>Updated {new Date(candidate.updated_at).toLocaleDateString()}</span>}
      </div>
    </article>
  );
}

function CandidateEditor({
  formState,
  onChange,
  onSave,
  isSaving,
  linkedAccount,
  onToggleStatus,
  onDelete,
  deletingCandidateId,
}: {
  formState: CandidateFormState;
  onChange: (state: CandidateFormState) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  linkedAccount?: CandidateAdminRecord["user"];
  onToggleStatus: (userId: string | undefined, nextStatus: boolean) => void;
  onDelete: (candidateId: string) => void;
  deletingCandidateId: string | null;
}) {
  const handleFieldChange = (field: keyof CandidateFormState, value: string) => {
    onChange({ ...formState, [field]: value });
  };

  return (
    <div className="mt-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Linked account</p>
        {linkedAccount ? (
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-200">
            <span>{linkedAccount.full_name || "Account"}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${linkedAccount.is_active === false ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`}>
              {linkedAccount.is_active === false ? "Inactive" : "Active"}
            </span>
            <button
              onClick={() => onToggleStatus(linkedAccount._id, linkedAccount.is_active === false)}
              className="text-xs text-slate-300 underline"
            >
              {linkedAccount.is_active === false ? "Activate" : "Disable"}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No linked login found.</p>
        )}
      </div>
      <div className="grid gap-4">
        <label className="text-sm text-slate-300">
          Full name
          <input
            value={formState.full_name}
            onChange={(event) => handleFieldChange("full_name", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Current role
          <input
            value={formState.current_role}
            onChange={(event) => handleFieldChange("current_role", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Experience (years)
          <input
            value={formState.experience_years}
            onChange={(event) => handleFieldChange("experience_years", event.target.value.replace(/[^0-9.]/g, ""))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Education
          <input
            value={formState.education}
            onChange={(event) => handleFieldChange("education", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Phone
          <input
            value={formState.phone}
            onChange={(event) => handleFieldChange("phone", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Skills (comma separated)
          <textarea
            value={formState.skills}
            onChange={(event) => handleFieldChange("skills", event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {isSaving ? "Saving..." : "Save changes"}
      </button>
      <button
        onClick={() => onDelete(formState.candidateId)}
        disabled={isSaving || deletingCandidateId === formState.candidateId}
        className="w-full rounded-2xl border border-rose-400/60 px-4 py-3 text-sm font-semibold text-rose-100 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deletingCandidateId === formState.candidateId ? "Deleting..." : "Delete candidate"}
      </button>
    </div>
  );
}

function RecruiterCard({
  recruiter,
  onSelect,
  onToggleStatus,
  isSelected,
}: {
  recruiter: RecruiterAdminRecord;
  onSelect: (recruiter: RecruiterAdminRecord) => void;
  onToggleStatus: (userId: string | undefined, nextStatus: boolean) => void;
  isSelected: boolean;
}) {
  const statusLabel = recruiter.is_active === false ? "Inactive" : "Active";
  const statusColor = recruiter.is_active === false ? "text-rose-300" : "text-emerald-300";
  return (
    <article
      className={`rounded-3xl border px-4 py-4 transition ${
        isSelected ? "border-blue-400/60 bg-blue-400/5" : "border-white/10 bg-slate-900/60"
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{recruiter.full_name || recruiter.email}</p>
          <p className="text-xs text-slate-400">{recruiter.company || "Company unknown"}</p>
          <p className={`text-xs ${statusColor}`}>{statusLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onToggleStatus(recruiter._id, recruiter.is_active === false)}
            className="rounded-xl border border-white/15 px-3 py-1 text-xs text-white hover:bg-white/10"
          >
            {recruiter.is_active === false ? "Activate" : "Disable"}
          </button>
          <button
            onClick={() => onSelect(recruiter)}
            className="rounded-xl bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-white"
          >
            Manage
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">
        {recruiter.phone && <span>{recruiter.phone}</span>}
        {recruiter.created_at && <span>Joined {new Date(recruiter.created_at).toLocaleDateString()}</span>}
      </div>
    </article>
  );
}

function RecruiterEditor({
  formState,
  onChange,
  onSave,
  isSaving,
  recruiter,
  onToggleStatus,
  onDelete,
  deletingRecruiterId,
}: {
  formState: RecruiterFormState;
  onChange: (state: RecruiterFormState) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  recruiter: RecruiterAdminRecord;
  onToggleStatus: (userId: string | undefined, nextStatus: boolean) => void;
  onDelete: (recruiterId: string) => void;
  deletingRecruiterId: string | null;
}) {
  const handleFieldChange = (field: keyof RecruiterFormState, value: string) => {
    onChange({ ...formState, [field]: value });
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3 text-sm text-slate-200">
        <span>Status:</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${recruiter.is_active === false ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`}>
          {recruiter.is_active === false ? "Inactive" : "Active"}
        </span>
        <button
          onClick={() => onToggleStatus(recruiter._id, recruiter.is_active === false)}
          className="text-xs text-slate-300 underline"
        >
          {recruiter.is_active === false ? "Activate" : "Disable"}
        </button>
      </div>
      <div className="grid gap-4">
        <label className="text-sm text-slate-300">
          Full name
          <input
            value={formState.full_name}
            onChange={(event) => handleFieldChange("full_name", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Company
          <input
            value={formState.company}
            onChange={(event) => handleFieldChange("company", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Phone
          <input
            value={formState.phone}
            onChange={(event) => handleFieldChange("phone", event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Notes
          <textarea
            value={formState.notes}
            onChange={(event) => handleFieldChange("notes", event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {isSaving ? "Saving..." : "Save recruiter"}
      </button>
      <button
        onClick={() => onDelete(formState.recruiterId)}
        disabled={isSaving || deletingRecruiterId === formState.recruiterId}
        className="w-full rounded-2xl border border-rose-400/60 px-4 py-3 text-sm font-semibold text-rose-100 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deletingRecruiterId === formState.recruiterId ? "Deleting..." : "Delete recruiter"}
      </button>
    </div>
  );
}
