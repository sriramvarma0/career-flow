import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { type ApplicationFilters } from "@/types/jobvault";

const pageSize = 6;

export function buildApplicationWhere(userId: string, filters: ApplicationFilters = {}) {
  const where: Prisma.ApplicationWhereInput = { userId };

  if (filters.query) {
    where.OR = [
      { companyName: { contains: filters.query } },
      { jobTitle: { contains: filters.query } },
      { applicationReferenceId: { contains: filters.query } },
      { jobId: { contains: filters.query } },
      { appliedPlatform: { contains: filters.query } },
    ];
  }

  if (filters.status && filters.status !== "all") {
    where.status = filters.status;
  }

  if (filters.source && filters.source !== "all") {
    where.source = filters.source;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = new Date(filters.from);
    }
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  return where;
}

export async function listApplications(userId: string, filters: ApplicationFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const where = buildApplicationWhere(userId, filters);

  const orderBy =
    filters.sort === "oldest"
      ? { createdAt: "asc" as const }
      : filters.sort === "appliedDateNewest"
        ? [
            { appliedDate: "desc" as const },
            { createdAt: "desc" as const },
          ]
        : filters.sort === "appliedDateOldest"
          ? [
              { appliedDate: "asc" as const },
              { createdAt: "asc" as const },
            ]
        : filters.sort === "company"
          ? { companyName: "asc" as const }
          : filters.sort === "status"
            ? { status: "asc" as const }
            : [
              { appliedDate: "desc" as const },
              { createdAt: "desc" as const },
            ];

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        documents: true,
        applicationNotes: true,
        statusHistory: true,
      },
    }),
  ]);

  return {
    applications,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getApplicationById(userId: string, applicationId: string) {
  return prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
      applicationNotes: {
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        orderBy: [
          { changedAt: "desc" },
          { id: "desc" }
        ],
      },
    },
  });
}