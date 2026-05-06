"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!user) {
    return (
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-lg font-bold text-white">
              Smart Competency Builder
            </Link>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-slate-300 hover:text-white transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-lg font-bold text-white">
              Smart Competency Builder
            </Link>
            <div className="flex items-center gap-6">
              {user.role === "CANDIDATE" && (
                <>
                  <Link
                    href="/profile"
                    className="text-slate-300 hover:text-white transition font-semibold"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/jobs"
                    className="text-slate-300 hover:text-white transition"
                  >
                    Browse Jobs
                  </Link>
                  <Link
                    href="/profile/history"
                    className="text-slate-300 hover:text-white transition"
                  >
                    Session History
                  </Link>
                  <Link
                    href="/profile?panel=notifications"
                    className="relative rounded-xl border border-slate-700/70 bg-slate-800/70 p-2.5 text-slate-200 transition hover:border-slate-500 hover:text-white"
                    aria-label="Notifications"
                  >
                    <BellIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/profile/interviews"
                    className="rounded-xl border border-slate-700/70 bg-slate-800/70 p-2.5 text-slate-200 transition hover:border-slate-500 hover:text-white"
                    aria-label="Interview desk"
                  >
                    <CalendarIcon className="h-5 w-5" />
                  </Link>
                </>
              )}
              {user.role === "ADMIN" && (
                <>
                  <Link href="/admin" className="text-slate-300 hover:text-white transition text-sm font-semibold">
                    Dashboard
                  </Link>
                  <span className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
                    Admin
                  </span>
                </>
              )}
              {user.role === "RECRUITER" && (
                <>
                  <Link href="/recruiter" className="text-slate-300 hover:text-white transition text-sm font-semibold">
                    Dashboard
                  </Link>
                  <Link href="/recruiter/postings" className="text-slate-300 hover:text-white transition text-sm">
                    My Postings
                  </Link>
                  <Link href="/recruiter/candidates" className="text-slate-300 hover:text-white transition text-sm">
                    Candidates
                  </Link>
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                    Recruiter
                  </span>
                </>
              )}
              <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-slate-200 hover:border-slate-500"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="sr-only">Open user menu</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white">
                  {initials}
                </div>
                <svg
                  className={`h-4 w-4 transition ${menuOpen ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-50 mt-3 w-56 rounded-xl bg-white py-2 text-sm text-slate-800 shadow-2xl">
                  <div className="border-b border-slate-100 px-4 pb-2 text-xs font-semibold uppercase text-slate-400">
                    {user.full_name || user.email}
                  </div>
                  {user.role === "CANDIDATE" && (
                    <Link
                      href="/profile#profile-lab"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      My Profile
                    </Link>
                  )}
                  {user.role === "CANDIDATE" && (
                    <Link
                      href="/profile/history"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      History Hub
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </nav>
    </>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 15a2 2 0 0 0 2-2 6 6 0 0 0-5-5.91V6a3 3 0 0 0-6 0v1.09A6 6 0 0 0 4 13a2 2 0 0 0 2 2" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}
