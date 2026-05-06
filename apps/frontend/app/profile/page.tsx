"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type CandidateProfile = {
  _id?: string;
  email: string;
  full_name?: string;
  phone?: string;
  current_role?: string;
  experience_years?: number;
  education?: string;
  skills?: string[];
  portfolio_links?: string[];
  resume_text?: string;
  updated_at?: string;
};

type JobDescriptionState = {
  title: string;
  description: string;
  required_skills: string;
  experience_required: string;
  responsibilities: string;
  qualifications: string;
};

type JobDescriptionParsed = {
  title?: string;
  description?: string;
  required_skills?: string[];
  experience_required?: number | null;
  responsibilities?: string;
  qualifications?: string;
};

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

type InvitationStatusType = "PENDING" | "VIEWED" | "ACCEPTED" | "DECLINED" | "CANCELLED";

type RecruiterInviteNotification = {
  _id: string;
  job_id: string;
  job_title?: string;
  recruiter_email: string;
  candidate_email: string;
  message?: string;
  status: InvitationStatusType;
  created_at: string;
  updated_at: string;
};

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toasts, setToasts] = useState<Array<{ id: number; type: "success" | "error"; text: string }>>([]);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [notificationsData, setNotificationsData] = useState<RecruiterInviteNotification[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [updatingInviteId, setUpdatingInviteId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingJobDescription, setIsUploadingJobDescription] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    current_role: "",
    experience_years: "",
    education: "",
    skills: "",
    portfolio_links: "",
  });

  const [jobDescription, setJobDescription] = useState<JobDescriptionState>({
    title: "",
    description: "",
    required_skills: "",
    experience_required: "",
    responsibilities: "",
    qualifications: "",
  });

  const isCandidate = user?.role === "CANDIDATE";

  const pushToast = useCallback((type: "success" | "error", text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadProfile = useCallback(async () => {
    if (!isCandidate) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 404) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to load profile");
      }

      const data: CandidateProfile = await response.json();
      setProfile(data);
        setFormData({
          full_name: data.full_name ?? user?.full_name ?? "",
        phone: data.phone ?? "",
        current_role: data.current_role ?? "",
        experience_years: data.experience_years?.toString() ?? "",
        education: data.education ?? "",
        skills: (data.skills ?? []).join(", "),
        portfolio_links: (data.portfolio_links ?? []).join(", "),
      });
    } catch (error) {
      console.error(error);
      pushToast("error", error instanceof Error ? error.message : "Unable to load profile");
    } finally {
      setProfileLoading(false);
    }
  }, [isCandidate, user?.full_name, pushToast]);

  const loadHistory = useCallback(async () => {
    if (!isCandidate) {
      setHistory([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api/profile/analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to load history");
      }

      const data: AnalysisRecord[] = await response.json();
      setHistory(data);
    } catch (error) {
      console.error(error);
      pushToast("error", error instanceof Error ? error.message : "Unable to load analysis history");
    }
  }, [isCandidate, pushToast]);

  const loadNotifications = useCallback(async () => {
    if (!isCandidate) {
      setNotificationsData([]);
      return;
    }

    setNotificationsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api/profile/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || "Failed to load notifications");
      }

      const data: RecruiterInviteNotification[] = await response.json();
      setNotificationsData(data);
    } catch (error) {
      console.error(error);
      pushToast("error", error instanceof Error ? error.message : "Unable to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  }, [isCandidate, pushToast]);

  const handleInviteAction = async (inviteId: string, nextStatus: InvitationStatusType) => {
    try {
      setUpdatingInviteId(inviteId);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${API_BASE_URL}/api/profile/notifications/${inviteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail || "Failed to update invite");
      }

      const updatedInvite: RecruiterInviteNotification = await response.json();
      setNotificationsData((prev) => {
        const keepStatuses: InvitationStatusType[] = ["PENDING", "VIEWED"];
        const nextList = prev
          .map((invite) => (invite._id === updatedInvite._id ? updatedInvite : invite))
          .filter((invite) => keepStatuses.includes(invite.status));
        if (nextList.length === 0) {
          setShowNotifications(false);
        }
        return nextList;
      });
      pushToast(
        "success",
        nextStatus === "ACCEPTED" ? "Invite accepted" : nextStatus === "DECLINED" ? "Invite declined" : "Invite updated"
      );
    } catch (error) {
      console.error(error);
      pushToast("error", error instanceof Error ? error.message : "Unable to update invite");
    } finally {
      setUpdatingInviteId(null);
    }
  };

  const closeNotificationsPanel = () => {
    setShowNotifications(false);
    if (searchParams.get("panel") === "notifications") {
      router.replace(pathname);
    }
  };

  useEffect(() => {
    if (!isCandidate) return;
    loadProfile();
    loadHistory();
    loadNotifications();
  }, [isCandidate, loadProfile, loadHistory, loadNotifications]);

  useEffect(() => {
    if (!isCandidate) return;
    if (searchParams.get("panel") === "notifications") {
      setShowNotifications(true);
      void loadNotifications();
    }
  }, [isCandidate, searchParams, loadNotifications]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      pushToast("error", "Please upload a PDF file");
      return;
    }

    setIsUploading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const formDataPayload = new FormData();
      formDataPayload.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/profile/upload-resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataPayload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const data = await response.json();
      pushToast("success", "Resume uploaded and parsed successfully!");

      if (data.extracted_data) {
        setFormData((prev) => ({
          ...prev,
          skills: data.extracted_data.skills?.join(", ") || prev.skills,
          education: data.extracted_data.education || prev.education,
          experience_years: data.extracted_data.experience_years?.toString() || prev.experience_years,
        }));
      }

      await loadProfile();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  const handleJobDescriptionUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      pushToast("error", "Please upload a PDF file");
      return;
    }

    setIsUploadingJobDescription(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const formDataPayload = new FormData();
      formDataPayload.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/profile/upload-job-description`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataPayload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
      }

      const data: { parsed_data?: JobDescriptionParsed } = await response.json();
      const parsed = data.parsed_data;
      if (parsed) {
        setJobDescription((prev) => ({
          title: parsed.title || prev.title,
          description: parsed.description || prev.description,
          required_skills: (parsed.required_skills || []).join(", ") || prev.required_skills,
          experience_required:
            parsed.experience_required !== undefined && parsed.experience_required !== null
              ? parsed.experience_required.toString()
              : prev.experience_required,
          responsibilities: parsed.responsibilities || prev.responsibilities,
          qualifications: parsed.qualifications || prev.qualifications,
        }));
      }

      pushToast("success", "Job description parsed. Review and adjust fields below.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to upload job description");
    } finally {
      setIsUploadingJobDescription(false);
      inputEl.value = "";
    }
  };

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const payload = {
        ...formData,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        skills: formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        portfolio_links: formData.portfolio_links
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const response = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Update failed");
      }

      pushToast("success", "Profile saved!");
      await loadProfile();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.title || !jobDescription.description) {
      pushToast("error", "Please fill in job title and description");
      return;
    }

    setIsAnalyzing(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const processedJobDescription = {
        ...jobDescription,
        required_skills: jobDescription.required_skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        experience_required: jobDescription.experience_required
          ? parseInt(jobDescription.experience_required)
          : null,
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
        const error = await response.json();
        throw new Error(error.detail || "Analysis failed");
      }

      const analysis: AnalysisData = await response.json();

      localStorage.setItem(
        "latest_analysis",
        JSON.stringify({
          analysis,
          jobTitle: jobDescription.title,
          jobDescription: processedJobDescription,
          createdAt: new Date().toISOString(),
        })
      );

      await loadHistory();
      window.location.href = "/analysis";
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to analyze compatibility");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white px-8 py-6 shadow">Loading your workspace...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white px-8 py-6 shadow">Log in to manage your profile.</div>
      </div>
    );
  }

  if (!isCandidate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white px-8 py-6 shadow text-center">
          Admins manage candidates from the dashboard. Switch to a candidate account to view this page.
        </div>
      </div>
    );
  }

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleString() : "Not updated yet";

  const latestSession = history[0];
  const averageMatch = history.length
    ? Math.round(
        history.reduce((sum, record) => sum + (record.analysis?.overall_match ?? 0), 0) / history.length
      )
    : null;

  const quickStats = [
    {
      label: "Profile sync",
      value: profile ? "Complete" : "Pending",
      caption: profile ? formatDate(profile.updated_at) : "Upload a resume to populate details",
    },
    {
      label: "Last analysis",
      value: latestSession ? `${latestSession.analysis.overall_match.toFixed(1)}%` : "Not run",
      caption: latestSession ? new Date(latestSession.created_at).toLocaleString() : "Run compatibility once ready",
    },
    {
      label: "Average match",
      value: averageMatch !== null ? `${averageMatch}%` : "—",
      caption: history.length ? `${history.length} sessions tracked` : "History builds after each run",
    },
  ];

  const journeySteps = [
    "Sync your resume or fill in the essentials",
    "Pin the job description you want to test",
    "Run compatibility to see AI insights",
    "Review history to keep improving",
  ];

  const pendingInviteCount = notificationsData.length;

  const inviteStatusStyles: Record<InvitationStatusType, string> = {
    PENDING: "border-amber-400/30 bg-amber-500/20 text-amber-100",
    VIEWED: "border-blue-400/30 bg-blue-500/20 text-blue-100",
    ACCEPTED: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
    DECLINED: "border-rose-400/30 bg-rose-500/20 text-rose-100",
    CANCELLED: "border-slate-400/20 bg-slate-500/20 text-slate-200",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-blue-900/40 p-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-4">
              <p className="inline-flex items-center rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.3em] text-blue-200">
                Candidate Workspace
              </p>
              <div>
                <h1 className="text-4xl font-semibold leading-tight text-white">
                  Hi {formData.full_name || user.full_name || "there"}, let&apos;s capture your story.
                </h1>
                <p className="mt-3 text-base text-slate-200">
                  Upload your resume or curate details manually, then compare yourself with any role in seconds.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {journeySteps.map((step) => (
                  <span key={step} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-100">
                    {step}
                  </span>
                ))}
              </div>
            </div>
            <div className="w-full rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-sm text-slate-200 lg:max-w-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Profile snapshot</p>
                <span className="text-xs text-slate-400">{formatDate(profile?.updated_at)}</span>
              </div>
              {profileLoading ? (
                <p className="mt-4 text-slate-400">Loading profile...</p>
              ) : profile ? (
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-xs uppercase text-slate-400">Role</p>
                    <p className="text-base font-semibold text-white">{profile.current_role || "Not set"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-slate-200">
                    <div>
                      <p className="text-xs uppercase text-slate-400">Experience</p>
                      <p className="text-lg font-semibold text-white">{profile.experience_years ?? "0"} yrs</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Education</p>
                      <p className="text-base font-semibold text-white">{profile.education || "Not set"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-400">Skills</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(profile.skills ?? []).length === 0 && (
                        <span className="text-xs text-slate-500">Add skills to tailor recommendations</span>
                      )}
                      {(profile.skills ?? []).slice(0, 8).map((skill) => (
                        <span key={skill} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-slate-400">No profile yet. Upload a resume or fill the form below.</p>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
            <p>
              {pendingInviteCount > 0
                ? `You have ${pendingInviteCount} pending invite${pendingInviteCount > 1 ? "s" : ""}.`
                : "No pending invites right now."}
            </p>
            <p className="text-xs text-slate-400">Use top-right navbar icons for notifications and interview desk.</p>
          </div>
        </header>

        {showNotifications && (
          <div
            className="fixed inset-0 z-40 flex items-start justify-end bg-slate-950/70 px-4 py-8"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeNotificationsPanel();
              }
            }}
          >
            <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recruiter notifications</p>
                  <h3 className="text-2xl font-semibold text-white">Invites ({pendingInviteCount})</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void loadNotifications()}
                    className="rounded-2xl border border-white/15 px-3 py-1 text-xs text-white hover:bg-white/10"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={closeNotificationsPanel}
                    className="rounded-2xl border border-white/15 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="mt-5 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                {notificationsLoading ? (
                  <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-300">Checking for invites...</div>
                ) : notificationsData.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-300">
                    No recruiter invites yet. Keep your profile fresh and they will land here.
                  </div>
                ) : (
                  notificationsData.map((invite) => (
                    <article key={invite._id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{invite.job_title || "Opportunity invite"}</p>
                          <p className="text-xs text-slate-400">From {invite.recruiter_email}</p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] ${inviteStatusStyles[invite.status]}`}
                        >
                          {invite.status}
                        </span>
                      </div>
                      {invite.message && <p className="mt-3 text-sm text-slate-200">{invite.message}</p>}
                      <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">Received {new Date(invite.created_at).toLocaleString()}</p>
                      {invite.status === "PENDING" && (
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <button
                            onClick={() => void handleInviteAction(invite._id, "ACCEPTED")}
                            disabled={updatingInviteId === invite._id}
                            className="flex-1 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-600"
                          >
                            {updatingInviteId === invite._id ? "Updating..." : "Accept interview"}
                          </button>
                          <button
                            onClick={() => void handleInviteAction(invite._id, "DECLINED")}
                            disabled={updatingInviteId === invite._id}
                            className="flex-1 rounded-2xl border border-rose-400/50 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingInviteId === invite._id ? "Updating..." : "Decline"}
                          </button>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {toasts.length > 0 && (
          <div className="pointer-events-none fixed right-4 top-24 z-[60] flex w-full max-w-sm flex-col gap-3">
            {toasts.map((toast) => (
              <ToastCard key={toast.id} toast={toast} onClose={() => dismissToast(toast.id)} />
            ))}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-400">{stat.caption}</p>
            </div>
          ))}
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">All sessions</p>
                <p className="mt-3 text-3xl font-semibold text-white">History</p>
                <p className="mt-1 text-xs text-slate-400">Dive into every compatibility run on its own page.</p>
              </div>
            </div>
            <Link
              href="/profile/history"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              View history hub →
            </Link>
          </div>
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Interviews</p>
            <p className="mt-3 text-3xl font-semibold text-white">Track progress</p>
            <p className="mt-1 text-xs text-slate-400">See ongoing vs completed interviews with one click.</p>
            <p className="mt-4 text-xs text-slate-400">Use the navbar shortcut to jump into your interview desk.</p>
          </div>
        </section>

        <section id="profile-lab" className="scroll-mt-28 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Student profile lab</p>
              <h2 className="text-2xl font-semibold text-white">Upload and manual entry in one workspace</h2>
              <p className="text-sm text-slate-300">Use either option or combine both to keep your profile complete and accurate.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Upload resume PDF</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Autofill your profile</h3>
                <p className="mt-2 text-sm text-slate-300">We parse key details and prefill fields automatically.</p>
                <div className="mt-6">
                  <input
                    type="file"
                    accept=".pdf"
                    id="resume-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="resume-upload"
                    className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-blue-500/20 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30"
                  >
                    {isUploading ? "Processing..." : "Upload resume PDF"}
                  </label>
                  <p className="mt-2 text-xs text-slate-400">Supports PDF up to 5MB • We store only extracted text</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workflow</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  {journeySteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-blue-200">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Manual entry</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Keep your profile fresh</h3>
              <form onSubmit={handleManualSubmit} className="mt-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    label="Full name"
                    value={formData.full_name}
                    onChange={(value) => setFormData({ ...formData, full_name: value })}
                  />
                  <FormField
                    label="Phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                  />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    label="Current role"
                    value={formData.current_role}
                    onChange={(value) => setFormData({ ...formData, current_role: value })}
                  />
                  <FormField
                    label="Years of experience"
                    type="number"
                    value={formData.experience_years}
                    onChange={(value) => setFormData({ ...formData, experience_years: value })}
                  />
                </div>
                <FormField
                  label="Education"
                  value={formData.education}
                  placeholder="e.g., B.Tech in Computer Science"
                  onChange={(value) => setFormData({ ...formData, education: value })}
                />
                <FormTextArea
                  label="Skills (comma-separated)"
                  value={formData.skills}
                  onChange={(value) => setFormData({ ...formData, skills: value })}
                />
                <FormField
                  label="Portfolio links (comma-separated)"
                  value={formData.portfolio_links}
                  placeholder="https://github.com/..., https://linkedin.com/..."
                  onChange={(value) => setFormData({ ...formData, portfolio_links: value })}
                />
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:bg-slate-500"
                >
                  {isSavingProfile ? "Saving..." : "Save profile"}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Job comparison lab</p>
              <h2 className="text-2xl font-semibold text-white">Paste, tweak, and analyze</h2>
              <p className="text-sm text-slate-300">Drop a JD or edit the fields, then fire a fresh compatibility run.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <button onClick={loadHistory} className="text-blue-200 hover:text-white">
                Refresh stats
              </button>
              <Link href="/profile/history" className="text-slate-300 hover:text-white">
                Open history hub
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Upload JD PDF</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Autofill everything</h3>
              <p className="mt-1 text-sm text-slate-300">
                Drop a JD PDF and we&apos;ll extract the details for you. Fine tune them on the right.
              </p>
              <div className="mt-6">
                <input
                  type="file"
                  accept=".pdf"
                  id="job-description-upload"
                  className="hidden"
                  onChange={handleJobDescriptionUpload}
                  disabled={isUploadingJobDescription}
                />
                <label
                  htmlFor="job-description-upload"
                  className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-blue-500/20 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30"
                >
                  {isUploadingJobDescription ? "Extracting details..." : "Upload job description"}
                </label>
                <p className="mt-2 text-xs text-slate-400">Supports PDF up to 5MB</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Manual edit</p>
              <div className="mt-4 space-y-5">
                <FormField
                  label="Job title *"
                  value={jobDescription.title}
                  onChange={(value) => setJobDescription({ ...jobDescription, title: value })}
                />
                <FormTextArea
                  label="Job description *"
                  value={jobDescription.description}
                  rows={4}
                  onChange={(value) => setJobDescription({ ...jobDescription, description: value })}
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    label="Required skills (comma-separated)"
                    value={jobDescription.required_skills}
                    onChange={(value) => setJobDescription({ ...jobDescription, required_skills: value })}
                  />
                  <FormField
                    label="Years of experience required"
                    type="number"
                    value={jobDescription.experience_required}
                    onChange={(value) => setJobDescription({ ...jobDescription, experience_required: value })}
                  />
                </div>
                <FormTextArea
                  label="Key responsibilities"
                  value={jobDescription.responsibilities}
                  rows={3}
                  onChange={(value) => setJobDescription({ ...jobDescription, responsibilities: value })}
                />
                <FormTextArea
                  label="Qualifications"
                  value={jobDescription.qualifications}
                  rows={3}
                  onChange={(value) => setJobDescription({ ...jobDescription, qualifications: value })}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-slate-300">
              Need inspiration? Compare multiple roles and watch your score trend evolve in the history section.
            </p>
          </div>
        </section>

        <div className="mt-8 flex justify-center pb-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="rounded-2xl bg-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-2xl shadow-emerald-500/40 transition hover:bg-emerald-600 disabled:bg-slate-500"
          >
            {isAnalyzing ? "Analyzing..." : "Run compatibility"}
          </button>
        </div>

      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
};

function ToastCard({
  toast,
  onClose,
}: {
  toast: { id: number; type: "success" | "error"; text: string };
  onClose: () => void;
}) {
  const toneClass =
    toast.type === "success"
      ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
      : "border-rose-300/40 bg-rose-500/15 text-rose-100";

  return (
    <div className={`pointer-events-auto relative overflow-hidden rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${toneClass}`} role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/80">{toast.type === "success" ? "Success" : "Error"}</p>
          <p className="mt-1 text-sm leading-relaxed">{toast.text}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          Close
        </button>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className="toast-progress h-full w-full bg-white/60" />
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder }: FormFieldProps) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none"
      />
    </label>
  );
}

type FormTextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

function FormTextArea({ label, value, onChange, rows = 3 }: FormTextAreaProps) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none"
      />
    </label>
  );
}

