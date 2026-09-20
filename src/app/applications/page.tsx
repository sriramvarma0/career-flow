import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppLayout, DashboardContent } from "@/components/app-layout";
import { DashboardHeader } from "@/components/dashboard-header";
import { ApplicationsTable } from "@/components/applications-table";
import { getApplicationsForUser } from "@/services/application-service";
import type { ApplicationFilters } from "@/types/jobvault";

export default async function ApplicationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolvedParams = (await searchParams) || {};
  const filters: ApplicationFilters = {
    query: typeof resolvedParams.query === "string" ? resolvedParams.query : undefined,
    status:
      typeof resolvedParams.status === "string" && resolvedParams.status.trim() !== ""
        ? resolvedParams.status
        : undefined,
    source:
      typeof resolvedParams.source === "string" && ["CompanyWebsite", "LinkedIn", "Referral", "Recruiter", "JobBoard", "College", "Other", "all"].includes(resolvedParams.source)
        ? (resolvedParams.source as ApplicationFilters["source"])
        : undefined,
    from: typeof resolvedParams.from === "string" ? resolvedParams.from : undefined,
    to: typeof resolvedParams.to === "string" ? resolvedParams.to : undefined,
    sort:
      typeof resolvedParams.sort === "string" && ["newest", "oldest", "company", "status", "appliedDateNewest", "appliedDateOldest"].includes(resolvedParams.sort)
        ? (resolvedParams.sort as ApplicationFilters["sort"])
        : undefined,
    page: typeof resolvedParams.page === "string" ? Number(resolvedParams.page) : 1,
  };

  const { applications, totalPages, page, total } = await getApplicationsForUser(session.user.id, filters);

  return (
    <AppLayout>
      <DashboardContent
        header={
          <DashboardHeader
            title="Applications"
            description="Manage all job applications, search by company or position, and keep your pipeline organized."
            breadcrumbs={<span>Home / Applications</span>}
            actions={(
              <Link href="/applications/new" className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-medium !text-white shadow-sm shadow-blue-200 transition hover:bg-blue-500">
                <Plus className="h-4 w-4" />
                Add Application
              </Link>
            )}
          />
        }
      >
        <div className="space-y-6">
          <ApplicationsTable
            applications={applications.map((application) => {
              const sortedHistory = [...application.statusHistory].sort((a, b) => {
                const timeA = a.changedAt ? new Date(a.changedAt).getTime() : 0;
                const timeB = b.changedAt ? new Date(b.changedAt).getTime() : 0;
                if (timeA !== timeB) return timeA - timeB;
                return a.id.localeCompare(b.id);
              });
              const lastStage = sortedHistory[sortedHistory.length - 1];
              const statusDate = lastStage ? lastStage.changedAt : null;

              return {
                id: application.id,
                companyName: application.companyName,
                jobTitle: application.jobTitle,
                status: application.status,
                appliedDate: application.appliedDate,
                source: application.source,
                appliedPlatform: application.appliedPlatform,
                salary: application.salary,
                location: application.location,
                statusDate,
              };
            })}
            total={total}
            page={page}
            totalPages={totalPages}
            filters={filters}
            showControls
          />
        </div>
      </DashboardContent>
    </AppLayout>
  );
}
