import { prisma } from "@/infrastructure/database/prisma";
import { applicationStatuses, type DashboardMetrics } from "@/types/jobvault";

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const [applications, customStatuses] = await Promise.all([
    prisma.application.findMany({
      where: { userId },
      select: { status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customStatus.findMany({
      where: { userId },
      select: { name: true, linkedStatus: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Map of status names to their primary categories
  const statusCategoryMap = new Map<string, string>();
  customStatuses.forEach((cs) => {
    statusCategoryMap.set(cs.name, cs.linkedStatus);
  });

  const getCategory = (status: string): string => {
    return statusCategoryMap.get(status) || status;
  };

  const byStatus = applicationStatuses.map((status) => ({
    status,
    count: applications.filter((application) => getCategory(application.status) === status).length,
  }));

  const monthMap = new Map<string, number>();

  for (const application of applications) {
    const month = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(application.createdAt);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }

  return {
    totalApplications: applications.length,
    inProgress: applications.filter((application) => !["Offer", "Rejected", "Withdrawn"].includes(getCategory(application.status))).length,
    offered: applications.filter((application) => getCategory(application.status) === "Offer").length,
    rejected: applications.filter((application) => getCategory(application.status) === "Rejected").length,
    withdrawn: applications.filter((application) => getCategory(application.status) === "Withdrawn").length,
    byStatus,
    monthlyApplications: Array.from(monthMap.entries()).map(([month, count]) => ({ month, count })),
  };
}