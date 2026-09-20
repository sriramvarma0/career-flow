import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, BriefcaseBusiness, CircleCheckBig, CircleX, Clock3, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboardMetrics } from "@/services/dashboard-service";
import { AppLayout, DashboardContent } from "@/components/app-layout";
import { DashboardHeader } from "@/components/dashboard-header";
import { StatsCard } from "@/components/stats-card";
import { ApplicationsTable } from "@/components/applications-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardChart } from "@/components/dashboard-chart";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const metrics = await getDashboardMetrics(session.user.id);

  const dashboardRows = metrics.byStatus.map((entry, index) => ({
    id: `dashboard-${entry.status}-${index}`,
    companyName: `${entry.status} Labs`,
    jobTitle: "Product Designer",
    status: entry.status,
    appliedDate: new Date(),
    source: "LinkedIn",
    appliedPlatform: "LinkedIn",
    salary: "-",
    location: "Remote",
    statusDate: new Date(),
  }));

  return (
    <AppLayout>
      <DashboardContent
        header={
          <DashboardHeader
            title="Dashboard"
            description="Monitor your pipeline, review status trends, and move through applications faster."
            breadcrumbs={<span>Home / Dashboard</span>}
            actions={(
              <>
                <Link href="/applications" className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                  View applications
                </Link>
                <Link href="/applications/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-medium !text-white shadow-sm shadow-blue-200 transition hover:bg-blue-500">
                  <Plus className="h-4 w-4" />
                  Add Application
                </Link>
              </>
            )}
          />
        }
        rightPanel={
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline summary</CardTitle>
                <CardDescription>Quick read on the current status distribution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.byStatus.map((entry) => (
                  <div key={entry.status} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">{entry.status === "HRRound" ? "HR Round" : entry.status}</span>
                    <span className="text-lg font-semibold text-blue-700">{entry.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current focus</CardTitle>
                <CardDescription>Use this panel for reminders, alerts, and secondary actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-blue-50 px-4 py-3">Follow up on active interview loops.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Upload new documents to the latest applications.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">Review offers before the end of the week.</div>
              </CardContent>
            </Card>
          </div>
        }
      >
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatsCard label="Total Applications" value={metrics.totalApplications} icon={<BriefcaseBusiness className="h-5 w-5" />} />
            <StatsCard label="In Progress" value={metrics.inProgress} icon={<Clock3 className="h-5 w-5" />} />
            <StatsCard label="Offered" value={metrics.offered} icon={<CircleCheckBig className="h-5 w-5" />} />
            <StatsCard label="Rejected" value={metrics.rejected} icon={<CircleX className="h-5 w-5" />} />
            <StatsCard label="Withdrawn" value={metrics.withdrawn} icon={<BarChart3 className="h-5 w-5" />} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Applications over time</CardTitle>
                <CardDescription>Monthly application volume captured from your database.</CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardChart data={metrics.monthlyApplications} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Complete picture of where each application currently sits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.byStatus.map((entry) => (
                  <div key={entry.status} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">{entry.status === "HRRound" ? "HR Round" : entry.status}</span>
                    <span className="text-lg font-semibold text-blue-700">{entry.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <ApplicationsTable applications={dashboardRows} showControls={false} />
        </div>
      </DashboardContent>
    </AppLayout>
  );
}