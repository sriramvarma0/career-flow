"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, ChevronDown, Search, FileText, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/status-pill";

type SearchResult = {
  applications: Array<{ id: string; companyName: string; jobTitle: string; status: string }>;
  documents: Array<{ id: string; originalFileName: string; applicationId: string; tags: string }>;
  notes: Array<{ id: string; content: string; applicationId: string; createdAt: string }>;
};

export function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session?.user?.name) {
            setUserName(session.user.name);
          }
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      }
    }
    fetchSession();
  }, []);

  const getInitials = (name: string) => {
    if (!name || name === "User") return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Debounce API calls
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (href: string) => {
    setQuery("");
    setIsOpen(false);
    router.push(href);
  };

  const hasResults = results && (
    results.applications.length > 0 ||
    results.documents.length > 0 ||
    results.notes.length > 0
  );

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-slate-200/80 bg-white/60 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-slate-900">CareerFlow</p>
            <p className="text-xs text-slate-500">Job application dashboard</p>
          </div>
        </Link>

        {/* Live Search Input & Dropdown */}
        <div ref={containerRef} className="hidden min-w-0 flex-1 justify-center md:flex relative">
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim()) setIsOpen(true);
              }}
              className="h-11 rounded-full bg-slate-50 pl-10 pr-10 text-sm border-slate-200 focus:bg-white transition"
              placeholder="Search applications, documents, or notes..."
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults(null);
                  setIsOpen(false);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Suggestions Overlay Dropdown */}
            {isOpen && (
              <div className="absolute top-[52px] left-0 z-50 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xl max-h-[480px] overflow-y-auto">
                {loading && (
                  <div className="py-2 text-center text-xs text-slate-500">Searching...</div>
                )}

                {!loading && !hasResults && (
                  <div className="py-4 text-center text-sm text-slate-500">
                    No results found for <span className="font-semibold text-slate-700">"{query}"</span>
                  </div>
                )}

                {!loading && results && (
                  <div className="space-y-4">
                    {/* Applications Category */}
                    {results.applications.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5 px-2">
                          Applications
                        </div>
                        <div className="space-y-0.5">
                          {results.applications.map((app) => (
                            <div
                              key={app.id}
                              onClick={() => handleItemClick(`/applications/${app.id}`)}
                              className="flex items-center justify-between rounded-xl px-2.5 py-2 hover:bg-blue-50/50 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <BriefcaseBusiness className="h-4 w-4 text-blue-500 shrink-0" />
                                <div className="truncate">
                                  <span className="font-semibold text-slate-800">{app.companyName}</span>
                                  <span className="text-slate-400 mx-1.5">·</span>
                                  <span className="text-slate-600">{app.jobTitle}</span>
                                </div>
                              </div>
                              <StatusPill status={app.status as any} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents Category */}
                    {results.documents.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5 px-2">
                          Documents
                        </div>
                        <div className="space-y-0.5">
                          {results.documents.map((doc) => (
                            <div
                              key={doc.id}
                              onClick={() => handleItemClick(`/applications/${doc.applicationId}`)}
                              className="flex items-center justify-between rounded-xl px-2.5 py-2 hover:bg-blue-50/50 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{doc.originalFileName}</span>
                              </div>
                              {doc.tags && (
                                <span className="bg-blue-50 text-blue-700 ring-1 ring-blue-700/10 text-[9px] px-2 py-0.5 font-medium rounded-full shrink-0">
                                  {doc.tags.split(",")[0]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes Category */}
                    {results.notes.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5 px-2">
                          Notes
                        </div>
                        <div className="space-y-0.5">
                          {results.notes.map((note) => (
                            <div
                              key={note.id}
                              onClick={() => handleItemClick(`/applications/${note.applicationId}`)}
                              className="flex flex-col rounded-xl px-2.5 py-2 hover:bg-blue-50/50 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="text-xs text-slate-400">Note excerpt</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600 line-clamp-2 pl-6">
                                {note.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full px-0 text-slate-600">
            <Bell className="h-4 w-4" />
          </Button>
          <Link href="/profile" className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {getInitials(userName)}
            </span>
            <span className="hidden sm:block text-sm font-medium">{userName}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </header>
  );
}
