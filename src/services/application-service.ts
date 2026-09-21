import { type ApplicationFilters } from "@/types/jobvault";
import { getApplicationById, getApplicationStats as fetchApplicationStats, listApplications } from "@/repositories/application-repository";

export async function getApplicationsForUser(userId: string, filters: ApplicationFilters = {}) {
  return listApplications(userId, filters);
}

export async function getApplicationDetail(userId: string, applicationId: string) {
  return getApplicationById(userId, applicationId);
}

export async function getApplicationStats(userId: string) {
  return fetchApplicationStats(userId);
}