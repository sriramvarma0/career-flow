import { prisma } from "@/infrastructure/database/prisma";
import { executeD1Query } from "@/infrastructure/database/d1-client";
import { getDatabaseProvider } from "@/infrastructure/config/env";

export interface SearchResults {
  applications: { id: string; companyName: string; jobTitle: string; status: string }[];
  documents: { id: string; originalFileName: string; applicationId: string; tags: string }[];
  notes: { id: string; content: string; applicationId: string; createdAt: Date }[];
}

export async function searchWorkspace(userId: string, query: string): Promise<SearchResults> {
  const provider = getDatabaseProvider();

  if (provider === "sqlite") {
    const [applications, documents, notes] = await Promise.all([
      prisma.application.findMany({
        where: {
          userId,
          OR: [
            { companyName: { contains: query } },
            { jobTitle: { contains: query } },
          ],
        },
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          status: true,
        },
        take: 5,
      }),
      prisma.document.findMany({
        where: {
          application: { userId },
          OR: [
            { originalFileName: { contains: query } },
            { tags: { contains: query } },
          ],
        },
        select: {
          id: true,
          originalFileName: true,
          applicationId: true,
          tags: true,
        },
        take: 5,
      }),
      prisma.applicationNote.findMany({
        where: {
          application: { userId },
          content: { contains: query },
        },
        select: {
          id: true,
          content: true,
          applicationId: true,
          createdAt: true,
        },
        take: 5,
      }),
    ]);

    return { applications, documents, notes };
  }

  // Cloudflare D1 implementation
  const q = `%${query}%`;

  const [appsRes, docsRes, notesRes] = await Promise.all([
    executeD1Query<Record<string, unknown>>(
      `SELECT id, companyName, jobTitle, status FROM Application WHERE userId = ? AND (companyName LIKE ? OR jobTitle LIKE ?) LIMIT 5`,
      [userId, q, q]
    ),
    executeD1Query<Record<string, unknown>>(
      `SELECT d.id, d.originalFileName, d.applicationId, d.tags FROM Document d JOIN Application a ON d.applicationId = a.id WHERE a.userId = ? AND (d.originalFileName LIKE ? OR d.tags LIKE ?) LIMIT 5`,
      [userId, q, q]
    ),
    executeD1Query<Record<string, unknown>>(
      `SELECT n.id, n.content, n.applicationId, n.createdAt FROM ApplicationNote n JOIN Application a ON n.applicationId = a.id WHERE a.userId = ? AND n.content LIKE ? LIMIT 5`,
      [userId, q]
    ),
  ]);

  return {
    applications: (appsRes.results || []).map((row) => ({
      id: String(row.id),
      companyName: String(row.companyName),
      jobTitle: String(row.jobTitle),
      status: String(row.status),
    })),
    documents: (docsRes.results || []).map((row) => ({
      id: String(row.id),
      originalFileName: String(row.originalFileName),
      applicationId: String(row.applicationId),
      tags: String(row.tags || ""),
    })),
    notes: (notesRes.results || []).map((row) => ({
      id: String(row.id),
      content: String(row.content),
      applicationId: String(row.applicationId),
      createdAt: new Date(String(row.createdAt)),
    })),
  };
}
