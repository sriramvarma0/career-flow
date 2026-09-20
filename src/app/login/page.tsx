import { LoginForm } from "@/components/forms/login-form";
import { AuthNavbar } from "@/components/auth-navbar";

export default function LoginPage() {
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden lg:h-auto lg:min-h-[100dvh] lg:overflow-visible justify-between">
      <AuthNavbar />
      <main className="flex-1 grid place-items-center px-4 pt-14 pb-2 lg:pt-24 lg:pb-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 lg:flex-row lg:items-stretch lg:gap-14">
          <section className="hidden lg:flex flex-1 flex-col justify-center rounded-[36px] border border-slate-700/60 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur lg:p-12">
            <p className="text-sm uppercase tracking-[0.34em] text-blue-400 font-semibold">CareerFlow</p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-tight text-slate-50">Track every application, note, document, and status change.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              A local-first job search workspace with authentication, document storage, analytics, and a structured audit trail.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["Applications", "Search, sort, and filter"],
                ["Documents", "Store local files safely"],
                ["History", "Track every status change"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-slate-700/60 bg-slate-950/50 p-4">
                  <p className="font-medium text-slate-50">{title}</p>
                  <p className="mt-1 text-sm text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="flex flex-1 items-center justify-center w-full">
            <LoginForm />
          </div>
        </div>
      </main>
      <footer className="py-4 border-t border-slate-200/60 bg-slate-50 text-center text-xs text-slate-500 z-10 shrink-0">
        © 2026 CareerFlow Private Limited. A company of SR Group. All rights reserved.
      </footer>
    </div>
  );
}