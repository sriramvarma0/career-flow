"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto flex flex-1 w-full max-w-[1600px] overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 flex flex-col justify-between overflow-y-auto h-full">
          <div className="flex-1 pb-8">{children}</div>
          <footer className="border-t border-slate-200/60 pt-5 text-xs text-slate-400 text-center shrink-0">
            © 2026 CareerFlow Private Limited. A company of SR Group. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}

export function DashboardContent({
  header,
  rightPanel,
  children,
}: {
  header: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={rightPanel ? "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" : "min-w-0"}>
      <div className="min-w-0 space-y-6">
        {header}
        {children}
      </div>

      {rightPanel ? (
        <aside className="space-y-6 xl:sticky xl:top-0 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:pr-1">
          {rightPanel}
        </aside>
      ) : null}
    </div>
  );
}
