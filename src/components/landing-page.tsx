"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  FileText,
  Lightbulb,
  ArrowRight,
  Lock,
  Shield,
  Sparkles,
  ChevronRight,
  FolderOpen,
  Database,
  CheckCircle,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";

type LandingPageProps = {
  hasSession: boolean;
};

type TimelineStep = {
  id: string;
  label: string;
  companyName: string;
  jobTitle: string;
  salary: string;
  location: string;
  notes: string;
  badgeColor: string;
  textColor: string;
};

const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: "applied",
    label: "Applied",
    companyName: "Stripe",
    jobTitle: "Product Engineer",
    salary: "$165,000",
    location: "Remote / US",
    notes: "Applied via employee referral. Automated confirmation email received. Recruiter reach-out expected in 3 days.",
    badgeColor: "bg-blue-50 text-blue-700 ring-1 ring-blue-700/10",
    textColor: "text-blue-600"
  },
  {
    id: "assessment",
    label: "Assessment",
    companyName: "Vercel",
    jobTitle: "Developer Advocate",
    salary: "$150,000",
    location: "Remote / Global",
    notes: "Received take-home coding assignment: build a serverless dashboard interface. Submitted repository links on Friday morning.",
    badgeColor: "bg-amber-50 text-amber-700 ring-1 ring-amber-700/10",
    textColor: "text-amber-600"
  },
  {
    id: "interview",
    label: "Interview",
    companyName: "Northstar Analytics",
    jobTitle: "Senior Frontend Engineer",
    salary: "$180,000",
    location: "San Francisco, CA",
    notes: "Completed 60-minute technical panel review on React server components. Positive feedback. Next is final system design session.",
    badgeColor: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-700/10",
    textColor: "text-indigo-600"
  },
  {
    id: "offer",
    label: "Offer",
    companyName: "Linear App",
    jobTitle: "Staff Systems Engineer",
    salary: "$210,000",
    location: "Remote / EU-US",
    notes: "Offer received! Base: $210k + equity options. Reviewing contract details, benefit structures, and drafting counter-offer response.",
    badgeColor: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10",
    textColor: "text-emerald-600"
  }
];

export function LandingPage({ hasSession }: LandingPageProps) {
  const [activeStep, setActiveStep] = useState<string>("interview");
  const [scrolled, setScrolled] = useState(false);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!hasSession) return;
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
  }, [hasSession]);

  const getInitials = (name: string) => {
    if (!name) return "CF";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const currentStepData = TIMELINE_STEPS.find((step) => step.id === activeStep) || TIMELINE_STEPS[2];

  return (
    <div className="min-h-screen bg-[#f8fbff] bg-grid-pattern text-slate-900 selection:bg-blue-500/10 selection:text-blue-700">
      
      {/* Background radial glows */}
      <div className="absolute top-0 left-0 -z-10 h-[500px] w-full overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/5 blur-[130px] animate-pulse-glow" />
        <div className="absolute top-0 right-10 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {/* Header / Navbar */}
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-blue-100/80 bg-white/60 backdrop-blur-md py-3 shadow-sm shadow-blue-100/10"
            : "border-b border-blue-100/80 bg-white/60 backdrop-blur-md py-3 shadow-sm shadow-blue-100/10 md:border-b-0 md:bg-transparent md:py-3 md:shadow-none"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/15">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">CareerFlow</span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition">Features</a>
            <a href="#pipeline" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition">Interactive Demo</a>
            <a href="#security" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition">Security</a>
          </div>

          <div className="flex items-center gap-3">
            {hasSession ? (
              <>
                <Link href="/dashboard" className="hidden sm:block">
                  <Button variant="ghost" className="bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-2xl text-sm font-medium">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/profile" className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {getInitials(userName)}
                  </span>
                  <span className="hidden sm:block text-xs font-semibold">{userName}</span>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" className="bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-2xl text-sm font-medium">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 rounded-2xl text-sm font-medium px-5">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 pt-2 pb-20 sm:px-6 lg:px-8 lg:pt-4 lg:pb-28">
        <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-7 flex flex-col justify-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/10 bg-blue-500/5 px-3.5 py-1 text-xs font-semibold tracking-wide text-blue-600 mb-6 w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Job Tracking Workspace</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-[64px] lg:leading-[1.1]">
              Your entire job search, <span className="text-blue-600">organized</span> in one workspace.
            </h1>
            
            <p className="mt-6 text-lg leading-8 text-slate-600 max-w-xl">
              Track resumes, manage application statuses, archive communications, and maintain a detailed, professional audit trail. Local-first storage guarantees your career data is private and always fast.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href={hasSession ? "/dashboard" : "/register"}>
                <Button className="h-12 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 rounded-2xl px-8 text-base font-semibold">
                  Start tracking for free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {!hasSession ? (
                <Link href="/login">
                  <Button variant="ghost" className="h-12 bg-slate-100 text-slate-800 hover:bg-slate-200/80 hover:text-slate-900 rounded-2xl px-6 text-base font-medium">
                    Sign In
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button variant="ghost" className="h-12 bg-slate-100 text-slate-800 hover:bg-slate-200/80 hover:text-slate-900 rounded-2xl px-6 text-base font-medium">
                    Go to Dashboard
                  </Button>
                </Link>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-slate-200/80 pt-8 max-w-lg">
              <div>
                <p className="text-2xl font-bold text-slate-900">100%</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">Local & Secure</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">0s</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">Data Lock-in</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">10x</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">More Organized</p>
              </div>
            </div>
          </div>

          {/* Right Floating Cards Visual */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-[10/9]">
              
              {/* Back Card - Dropbox-style Folder */}
              <div className="absolute top-0 right-4 w-[330px] rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100/80 animate-float-delayed">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold text-slate-700">resumes_v2/</span>
                  </div>
                  <span className="text-[10px] text-slate-400">2 files</span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-700 truncate">Staff_Engineer_Resume.pdf</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 shrink-0 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-transparent">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-slate-300 shrink-0" />
                      <span className="text-[11px] text-slate-500 truncate">Generic_Software_Resume.pdf</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">Draft</span>
                  </div>
                </div>
              </div>

              {/* Front Card - LinkedIn-style Job Pipeline */}
              <div className="absolute bottom-4 left-0 w-[340px] rounded-3xl border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-500/5 animate-float">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100 text-blue-700">
                      <BriefcaseBusiness className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">Stripe</p>
                      <p className="text-[10px] text-slate-500 font-medium">Software Engineer</p>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10 text-[9px] px-2 py-0.5 font-bold rounded-full">
                    Active Interview
                  </span>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-[11px] font-semibold text-slate-700">Next Step: Panel round</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    System design prep session on June 22. Focus heavily on caching, scaling, and database index options.
                  </p>
                </div>
              </div>

              {/* Floating Mini Glow */}
              <div className="absolute top-[30%] left-[10%] -z-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            </div>
          </div>

        </div>
      </section>

      {/* Interactive Pipeline Showcase (LinkedIn Inspired) */}
      <section id="pipeline" className="border-t border-blue-100 bg-[#f4f8fd]/70 py-20 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-72 w-72 rounded-full bg-blue-600/5 blur-[100px]" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Track status history with zero friction
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Interactive pipelines keep you organized. Click through the timeline steps below to see how CareerFlow tracks notes, salaries, and files dynamically.
            </p>
          </div>

          {/* Interactive timeline widget container */}
          <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-6 md:p-10 backdrop-blur shadow-xl shadow-slate-100">
            
            {/* Steps Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-10 pb-6 border-b border-slate-100">
              {TIMELINE_STEPS.map((step) => {
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60"
                    }`}
                  >
                    <div className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}>
                      {TIMELINE_STEPS.indexOf(step) + 1}
                    </div>
                    <span className="text-xs md:text-sm font-semibold">{step.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Step Detail Content */}
            <div className="grid gap-8 md:grid-cols-12 items-center">
              
              {/* Left detail card description */}
              <div className="md:col-span-7">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Pipeline State</span>
                <h3 className="mt-2 text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span>{currentStepData.companyName}</span>
                  <span className="text-slate-400 text-lg font-normal">·</span>
                  <span className="text-lg text-slate-600 font-medium">{currentStepData.jobTitle}</span>
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {currentStepData.notes}
                </p>

                {/* Additional parameters */}
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Salary</span>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{currentStepData.salary}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Location Details</span>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{currentStepData.location}</p>
                  </div>
                </div>
              </div>

              {/* Right preview simulation */}
              <div className="md:col-span-5 flex justify-center">
                <div className="w-full max-w-[280px] rounded-2xl bg-slate-50 border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-[11px] font-bold text-slate-400">AUDIT TRAIL</span>
                    <span className={`text-[9px] px-2 py-0.5 font-bold rounded-full ${currentStepData.badgeColor}`}>
                      {currentStepData.label}
                    </span>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-slate-700">Status Changed</p>
                        <p className="text-[9px] text-slate-400">Updated just now</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500">Created Application</p>
                        <p className="text-[9px] text-slate-400">Created 2 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Local Vault Features (Dropbox Inspired) */}
      <section id="features" className="border-t border-blue-50 bg-[#f8fbff] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Dropbox-style document organization
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Keep every version of your resumes, cover letters, and transcripts mapped directly to their corresponding applications. Everything is stored locally on your device for absolute security.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-sm font-semibold text-blue-600 cursor-pointer group">
              <span>Learn about local-first storage</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            
            {/* Card 1 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 hover:border-blue-200 hover:shadow-lg transition shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 mb-6">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Local-First Privacy</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                All records, document binary files, and notes are saved directly in your database. No external trackers, advertising engines, or scraping bots.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 hover:border-blue-200 hover:shadow-lg transition shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 mb-6">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Resume Mapping</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Instantly map custom resume variations, portfolios, and references to specific roles. Never mix up which version you sent to which recruiter again.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 hover:border-blue-200 hover:shadow-lg transition shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 mb-6">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Smart Action Notes</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Keep dynamic notes of interviewer profiles, prepared questions, salary options, and key takeaways for each pipeline stage.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Security & Architecture (LinkedIn Professional Standard) */}
      <section id="security" className="border-t border-blue-50 bg-[#f4f8fd]/70 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Graphics */}
            <div className="lg:col-span-5 flex justify-center order-last lg:order-first">
              <div className="relative w-full max-w-[340px] aspect-square rounded-3xl border border-slate-200 bg-white p-8 flex flex-col justify-between shadow-md">
                <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 shrink-0 grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/15">
                  <Shield className="h-6 w-6" />
                </div>
                
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Storage Protocol</span>
                  <h4 className="text-lg font-bold text-slate-900 mt-1">Encrypted Auth Credentials</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2">
                    Industry standard bcrypt hashing protects passwords. Credentials adapt safely to local sessions.
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-6">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <span className="text-[11px] font-semibold text-emerald-600">Isolated database files</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Text */}
            <div className="lg:col-span-7">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Security Architecture</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                A professional workspace built on trust
              </h2>
              <p className="mt-4 text-base text-slate-600">
                CareerFlow is designed to protect your most sensitive career progression documents. Your personal salary targets, interview logs, performance reviews, and draft references remain private.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Secure user isolation mapping via sqlite relational indices.",
                  "Zero cloud syncing on sensitive PDFs unless chosen explicitly.",
                  "Transparent database triggers tracking application status edits."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="border-t border-blue-50 bg-[#f8fbff] py-20 text-center relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-blue-600/5 blur-[90px] -z-10" />
        
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Ready to structure your job search?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600">
            Sign up now to upload documents, track interviews, manage details, and take full ownership of your professional pipelines.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href={hasSession ? "/dashboard" : "/register"}>
              <Button className="h-12 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 rounded-2xl px-8 text-base font-semibold">
                Get started for free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-50 bg-[#f4f8fd] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white text-slate-400 border border-slate-200">
              <BriefcaseBusiness className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-semibold text-slate-700">© 2026 CareerFlow Private Limited. A company of SR Group. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-800 transition">Features</a>
            <a href="#pipeline" className="hover:text-slate-800 transition">Demo</a>
            <a href="#security" className="hover:text-slate-800 transition">Security</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
