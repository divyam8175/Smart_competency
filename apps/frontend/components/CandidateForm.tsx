"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createCandidate, CandidatePayload } from "../lib/api";

const defaultPayload: CandidatePayload = {
  full_name: "",
  email: "",
  job_role: "",
  resume_text: "",
  portfolio_links: [],
};

export function CandidateForm() {
  const router = useRouter();
  const [form, setForm] = useState<CandidatePayload>(defaultPayload);
  const [linksInput, setLinksInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateField = (field: keyof CandidatePayload, value: string) => {
    setForm((prev: CandidatePayload) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Validation
    if (!form.full_name.trim()) {
      setMessage("❌ Please enter a full name");
      return;
    }
    if (!form.email.trim()) {
      setMessage("❌ Please enter an email");
      return;
    }
    if (!form.job_role.trim()) {
      setMessage("❌ Please enter a target role");
      return;
    }
    if (!form.resume_text.trim()) {
      setMessage("❌ Please enter resume text");
      return;
    }

    const payload: CandidatePayload = {
      ...form,
      portfolio_links: linksInput
        .split("\n")
        .map((link: string) => link.trim())
        .filter(Boolean),
    };

    startTransition(async () => {
      try {
        setMessage("⏳ Submitting candidate...");
        const response = await createCandidate(payload);
        console.log("Success response:", response);
        setForm(defaultPayload);
        setLinksInput("");
        setMessage("✅ Candidate submitted successfully! Redirecting...");
        
        // Redirect to candidates page after short delay
        setTimeout(() => {
          router.push("/candidates");
        }, 1500);
      } catch (error) {
        console.error("Submission error:", error);
        const detail = error instanceof Error ? error.message : "Unexpected error";
        setMessage(`❌ Error: ${detail}`);
      }
    });
  };

  return (
    <section className="mx-auto max-w-3xl rounded-2xl bg-slate-900/70 p-8 shadow-2xl shadow-accent/30">
      <h2 className="text-2xl font-semibold text-white">Add Candidate</h2>
      <p className="mt-2 text-slate-300">
        Paste resume text, include any relevant links, and we will extract competencies plus run local Ollama insights.
      </p>

      <div className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-slate-200">Full Name</span>
          <input
            className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-slate-100"
            value={form.full_name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField("full_name", e.target.value)}
            placeholder="Jane Talent"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-slate-200">Email</span>
          <input
            className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-slate-100"
            value={form.email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField("email", e.target.value)}
            placeholder="jane@example.com"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-slate-200">Target Role</span>
          <input
            className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-slate-100"
            value={form.job_role}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateField("job_role", e.target.value)}
            placeholder="Senior Data Scientist"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-slate-200">Resume / Summary Text</span>
          <textarea
            className="min-h-[160px] rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-slate-100"
            value={form.resume_text}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateField("resume_text", e.target.value)}
            placeholder="Paste resume text, bullet points, or narrative"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-slate-200">Portfolio links (one per line)</span>
          <textarea
            className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-slate-100"
            value={linksInput}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setLinksInput(e.target.value)}
            placeholder="https://github.com/example\nhttps://linkedin.com/in/example"
          />
        </label>

        <button
          className="mt-2 rounded-xl bg-accent px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? "⏳ Submitting..." : "Submit Candidate"}
        </button>

        {message && (
          <div className={`rounded-lg p-4 text-sm ${
            message.includes("✅") ? "bg-green-900/30 text-green-300" :
            message.includes("❌") ? "bg-red-900/30 text-red-300" :
            "bg-blue-900/30 text-blue-300"
          }`}>
            {message}
          </div>
        )}
      </div>
    </section>
  );
}
