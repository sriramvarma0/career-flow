import { prisma } from "@/infrastructure/database/prisma";
import { type ApplicationFilters } from "@/types/jobvault";
import { buildApplicationWhere, getApplicationById, listApplications } from "@/repositories/application-repository";

export async function getApplicationsForUser(userId: string, filters: ApplicationFilters = {}) {
  return listApplications(userId, filters);
}

export async function getApplicationDetail(userId: string, applicationId: string) {
  return getApplicationById(userId, applicationId);
}

export async function getApplicationStats(userId: string) {
  const where = buildApplicationWhere(userId);

  const applications = await prisma.application.findMany({
    where,
    select: { status: true, createdAt: true },
  });

  return applications;
}