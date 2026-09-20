import type { ReactNode } from "react";
import { AppLayout } from "@/components/app-layout";
import { DashboardHeader } from "@/components/dashboard-header";

type AppShellProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, subtitle, breadcrumbs, actions, children }: AppShellProps) {
  return (
    <AppLayout>
      <div className="space-y-6">
        <DashboardHeader title={title} description={subtitle} breadcrumbs={breadcrumbs} actions={actions} />
        {children}
      </div>
    </AppLayout>
  );
}
