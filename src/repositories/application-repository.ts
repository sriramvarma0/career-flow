import { Prisma, ApplicationSource } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { executeD1Query, executeD1Batch } from "@/infrastructure/database/d1-client";
import { getDatabaseProvider } from "@/infrastructure/config/env";
import { type ApplicationFilters } from "@/types/jobvault";
import { randomUUID } from "node:crypto";

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
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
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

  // Cloudflare D1 Implementation
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const whereConditions: string[] = ["userId = ?"];
  const queryParams: unknown[] = [userId];

  if (filters.query) {
    const q = `%${filters.query}%`;
    whereConditions.push("(companyName LIKE ? OR jobTitle LIKE ? OR applicationReferenceId LIKE ? OR jobId LIKE ? OR appliedPlatform LIKE ?)");
    queryParams.push(q, q, q, q, q);
  }

  if (filters.status && filters.status !== "all") {
    whereConditions.push("status = ?");
    queryParams.push(filters.status);
  }

  if (filters.source && filters.source !== "all") {
    whereConditions.push("source = ?");
    queryParams.push(filters.source);
  }

  if (filters.from) {
    whereConditions.push("createdAt >= ?");
    queryParams.push(new Date(filters.from).toISOString());
  }

  if (filters.to) {
    const end = new Date(filters.to);
    end.setHours(23, 59, 59, 999);
    whereConditions.push("createdAt <= ?");
    queryParams.push(end.toISOString());
  }

  const whereClause = whereConditions.join(" AND ");

  const countRes = await executeD1Query<Record<string, unknown>>(
    `SELECT COUNT(*) as total FROM Application WHERE ${whereClause}`,
    queryParams
  );
  const total = Number(countRes.results?.[0]?.total ?? 0);

  let orderByClause = "ORDER BY appliedDate DESC, createdAt DESC";
  if (filters.sort === "oldest") orderByClause = "ORDER BY createdAt ASC";
  else if (filters.sort === "appliedDateNewest") orderByClause = "ORDER BY appliedDate DESC, createdAt DESC";
  else if (filters.sort === "appliedDateOldest") orderByClause = "ORDER BY appliedDate ASC, createdAt ASC";
  else if (filters.sort === "company") orderByClause = "ORDER BY companyName ASC";
  else if (filters.sort === "status") orderByClause = "ORDER BY status ASC";

  const offset = (page - 1) * pageSize;
  const selectSql = `SELECT * FROM Application WHERE ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`;
  const selectParams = [...queryParams, pageSize, offset];

  const appsRes = await executeD1Query<Record<string, unknown>>(selectSql, selectParams);
  const rawApps = appsRes.results || [];

  const applications = await Promise.all(
    rawApps.map(async (appRow) => {
      const appId = String(appRow.id);
      const [docsRes, notesRes, historyRes] = await Promise.all([
        executeD1Query<Record<string, unknown>>(`SELECT * FROM Document WHERE applicationId = ? ORDER BY uploadedAt DESC`, [appId]),
        executeD1Query<Record<string, unknown>>(`SELECT * FROM ApplicationNote WHERE applicationId = ? ORDER BY createdAt DESC`, [appId]),
        executeD1Query<Record<string, unknown>>(`SELECT * FROM StatusHistory WHERE applicationId = ? ORDER BY changedAt DESC, id DESC`, [appId]),
      ]);

      return mapD1Application(appRow, docsRes.results || [], notesRes.results || [], historyRes.results || []);
    })
  );

  return {
    applications,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getApplicationById(userId: string, applicationId: string) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
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

  const appRes = await executeD1Query<Record<string, unknown>>(
    `SELECT * FROM Application WHERE id = ? AND userId = ? LIMIT 1`,
    [applicationId, userId]
  );
  const appRow = appRes.results?.[0];
  if (!appRow) return null;

  const [docsRes, notesRes, historyRes] = await Promise.all([
    executeD1Query<Record<string, unknown>>(`SELECT * FROM Document WHERE applicationId = ? ORDER BY uploadedAt DESC`, [applicationId]),
    executeD1Query<Record<string, unknown>>(`SELECT * FROM ApplicationNote WHERE applicationId = ? ORDER BY createdAt DESC`, [applicationId]),
    executeD1Query<Record<string, unknown>>(`SELECT * FROM StatusHistory WHERE applicationId = ? ORDER BY changedAt DESC, id DESC`, [applicationId]),
  ]);

  return mapD1Application(appRow, docsRes.results || [], notesRes.results || [], historyRes.results || []);
}

export async function getApplicationStats(userId: string) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const where = buildApplicationWhere(userId);
    return prisma.application.findMany({
      where,
      select: { status: true, createdAt: true },
    });
  }

  const res = await executeD1Query<Record<string, unknown>>(
    `SELECT status, createdAt FROM Application WHERE userId = ?`,
    [userId]
  );
  return (res.results || []).map((row) => ({
    status: String(row.status),
    createdAt: new Date(String(row.createdAt)),
  }));
}

export async function createApplication(data: {
  userId: string;
  companyName: string;
  jobTitle: string;
  applicationReferenceId?: string | null;
  source: string;
  status: string;
  appliedDate?: Date | null;
  jobUrl?: string | null;
  location?: string | null;
  salary?: string | null;
  experience?: string | null;
  appliedPlatform?: string | null;
  jobId?: string | null;
  notes?: string | null;
  historyData: { previousStatus?: string | null; newStatus: string; changedAt: Date }[];
}) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.application.create({
      data: {
        userId: data.userId,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        applicationReferenceId: data.applicationReferenceId || null,
        source: data.source as ApplicationSource,
        status: data.status,
        appliedDate: data.appliedDate,
        jobUrl: data.jobUrl || null,
        location: data.location || null,
        salary: data.salary || null,
        experience: data.experience || null,
        appliedPlatform: data.appliedPlatform || null,
        jobId: data.jobId || null,
        notes: data.notes || null,
        statusHistory: {
          create: data.historyData.map((h) => ({
            previousStatus: h.previousStatus || null,
            newStatus: h.newStatus,
            changedAt: h.changedAt,
          })),
        },
      },
    });
  }

  const applicationId = randomUUID();
  const now = new Date().toISOString();
  const appliedDateStr = data.appliedDate ? data.appliedDate.toISOString() : null;

  const batchStmts: { sql: string; params?: unknown[] }[] = [
    {
      sql: `INSERT INTO Application (id, userId, companyName, jobTitle, applicationReferenceId, source, status, appliedDate, jobUrl, location, salary, experience, appliedPlatform, jobId, notes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        applicationId,
        data.userId,
        data.companyName,
        data.jobTitle,
        data.applicationReferenceId || null,
        data.source || "Other",
        data.status || "Applied",
        appliedDateStr,
        data.jobUrl || null,
        data.location || null,
        data.salary || null,
        data.experience || null,
        data.appliedPlatform || null,
        data.jobId || null,
        data.notes || null,
        now,
        now,
      ],
    },
  ];

  for (const h of data.historyData) {
    batchStmts.push({
      sql: `INSERT INTO StatusHistory (id, applicationId, previousStatus, newStatus, changedAt) VALUES (?, ?, ?, ?, ?)`,
      params: [randomUUID(), applicationId, h.previousStatus || null, h.newStatus, h.changedAt ? h.changedAt.toISOString() : now],
    });
  }

  await executeD1Batch(batchStmts);
  return { id: applicationId };
}

export async function updateApplicationWithTimeline(data: {
  applicationId: string;
  existingStatus: string;
  companyName: string;
  jobTitle: string;
  applicationReferenceId?: string | null;
  source: string;
  status: string;
  appliedDate?: Date | null;
  jobUrl?: string | null;
  location?: string | null;
  salary?: string | null;
  experience?: string | null;
  appliedPlatform?: string | null;
  jobId?: string | null;
  notes?: string | null;
}) {
  const provider = getDatabaseProvider();
  const statusChanged = data.existingStatus !== data.status;

  if (provider === "sqlite") {
    if (statusChanged) {
      const defaultStatuses = ["Applied", "Assessment", "Interview", "HRRound", "Offer", "Rejected", "Withdrawn"];
      if (defaultStatuses.includes(data.status)) {
        const alreadyExists = await prisma.statusHistory.findFirst({
          where: { applicationId: data.applicationId, newStatus: data.status },
        });
        if (alreadyExists) {
          throw new Error(
            `Primary status '${data.status === "HRRound" ? "HR Round" : data.status}' already exists in this application's timeline and cannot be repeated.`
          );
        }
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.application.update({
        where: { id: data.applicationId },
        data: {
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          applicationReferenceId: data.applicationReferenceId || null,
          source: data.source as ApplicationSource,
          status: data.status,
          appliedDate: data.appliedDate ? new Date(data.appliedDate) : null,
          jobUrl: data.jobUrl || null,
          location: data.location || null,
          salary: data.salary || null,
          experience: data.experience || null,
          appliedPlatform: data.appliedPlatform || null,
          jobId: data.jobId || null,
          notes: data.notes || null,
        },
      });

      if (statusChanged) {
        await tx.statusHistory.create({
          data: {
            applicationId: data.applicationId,
            previousStatus: data.existingStatus,
            newStatus: data.status,
            changedAt: new Date(),
          },
        });
      }

      const newAppliedDate = data.appliedDate ? new Date(data.appliedDate) : null;
      if (newAppliedDate) {
        const appliedStage = await tx.statusHistory.findFirst({
          where: { applicationId: data.applicationId, newStatus: "Applied" },
        });
        if (appliedStage) {
          await tx.statusHistory.update({
            where: { id: appliedStage.id },
            data: { changedAt: newAppliedDate },
          });
        } else {
          await tx.statusHistory.create({
            data: {
              applicationId: data.applicationId,
              previousStatus: null,
              newStatus: "Applied",
              changedAt: newAppliedDate,
            },
          });
        }
      }
    });
    return;
  }

  // D1 implementation
  if (statusChanged) {
    const defaultStatuses = ["Applied", "Assessment", "Interview", "HRRound", "Offer", "Rejected", "Withdrawn"];
    if (defaultStatuses.includes(data.status)) {
      const existsRes = await executeD1Query<Record<string, unknown>>(
        `SELECT id FROM StatusHistory WHERE applicationId = ? AND newStatus = ? LIMIT 1`,
        [data.applicationId, data.status]
      );
      if (existsRes.results?.[0]) {
        throw new Error(
          `Primary status '${data.status === "HRRound" ? "HR Round" : data.status}' already exists in this application's timeline and cannot be repeated.`
        );
      }
    }
  }

  const now = new Date().toISOString();
  const newAppliedDateStr = data.appliedDate ? data.appliedDate.toISOString() : null;

  const appliedStageRes = await executeD1Query<Record<string, unknown>>(
    `SELECT id FROM StatusHistory WHERE applicationId = ? AND newStatus = 'Applied' LIMIT 1`,
    [data.applicationId]
  );
  const existingAppliedStageId = appliedStageRes.results?.[0]?.id ? String(appliedStageRes.results[0].id) : null;

  const batchStmts: { sql: string; params?: unknown[] }[] = [
    {
      sql: `UPDATE Application SET companyName = ?, jobTitle = ?, applicationReferenceId = ?, source = ?, status = ?, appliedDate = ?, jobUrl = ?, location = ?, salary = ?, experience = ?, appliedPlatform = ?, jobId = ?, notes = ?, updatedAt = ? WHERE id = ?`,
      params: [
        data.companyName,
        data.jobTitle,
        data.applicationReferenceId || null,
        data.source,
        data.status,
        newAppliedDateStr,
        data.jobUrl || null,
        data.location || null,
        data.salary || null,
        data.experience || null,
        data.appliedPlatform || null,
        data.jobId || null,
        data.notes || null,
        now,
        data.applicationId,
      ],
    },
  ];

  if (statusChanged) {
    batchStmts.push({
      sql: `INSERT INTO StatusHistory (id, applicationId, previousStatus, newStatus, changedAt) VALUES (?, ?, ?, ?, ?)`,
      params: [randomUUID(), data.applicationId, data.existingStatus, data.status, now],
    });
  }

  if (newAppliedDateStr) {
    if (existingAppliedStageId) {
      batchStmts.push({
        sql: `UPDATE StatusHistory SET changedAt = ? WHERE id = ?`,
        params: [newAppliedDateStr, existingAppliedStageId],
      });
    } else {
      batchStmts.push({
        sql: `INSERT INTO StatusHistory (id, applicationId, previousStatus, newStatus, changedAt) VALUES (?, ?, ?, ?, ?)`,
        params: [randomUUID(), data.applicationId, null, "Applied", newAppliedDateStr],
      });
    }
  }

  await executeD1Batch(batchStmts);
}

export async function deleteApplication(applicationId: string) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.application.delete({ where: { id: applicationId } });
  }

  await executeD1Batch([
    { sql: `DELETE FROM StatusHistory WHERE applicationId = ?`, params: [applicationId] },
    { sql: `DELETE FROM ApplicationNote WHERE applicationId = ?`, params: [applicationId] },
    { sql: `DELETE FROM Document WHERE applicationId = ?`, params: [applicationId] },
    { sql: `DELETE FROM Application WHERE id = ?`, params: [applicationId] },
  ]);
}

export async function updateStatusHistoryTimeline(
  applicationId: string,
  sortedStages: { status: string; date: string }[],
  appliedDate: Date | null
) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    await prisma.statusHistory.deleteMany({
      where: { applicationId },
    });

    for (let i = 0; i < sortedStages.length; i++) {
      const stage = sortedStages[i];
      const parsedDate = stage.date === "" ? null : (stage.date && !isNaN(Date.parse(stage.date)) ? new Date(stage.date) : new Date());
      await prisma.statusHistory.create({
        data: {
          applicationId,
          previousStatus: i > 0 ? sortedStages[i - 1].status : null,
          newStatus: stage.status,
          changedAt: parsedDate,
        },
      });
    }

    const lastStage = sortedStages[sortedStages.length - 1];
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        ...(lastStage ? { status: lastStage.status } : {}),
        appliedDate,
      },
    });
    return;
  }

  // Cloudflare D1 Batch Execution for Timeline Update
  const batchStmts: { sql: string; params?: unknown[] }[] = [
    { sql: `DELETE FROM StatusHistory WHERE applicationId = ?`, params: [applicationId] },
  ];

  for (let i = 0; i < sortedStages.length; i++) {
    const stage = sortedStages[i];
    const parsedDate = stage.date === "" ? null : (stage.date && !isNaN(Date.parse(stage.date)) ? new Date(stage.date).toISOString() : new Date().toISOString());
    batchStmts.push({
      sql: `INSERT INTO StatusHistory (id, applicationId, previousStatus, newStatus, changedAt) VALUES (?, ?, ?, ?, ?)`,
      params: [randomUUID(), applicationId, i > 0 ? sortedStages[i - 1].status : null, stage.status, parsedDate],
    });
  }

  const lastStage = sortedStages[sortedStages.length - 1];
  const now = new Date().toISOString();
  if (lastStage) {
    batchStmts.push({
      sql: `UPDATE Application SET status = ?, appliedDate = ?, updatedAt = ? WHERE id = ?`,
      params: [lastStage.status, appliedDate ? appliedDate.toISOString() : null, now, applicationId],
    });
  } else {
    batchStmts.push({
      sql: `UPDATE Application SET appliedDate = ?, updatedAt = ? WHERE id = ?`,
      params: [appliedDate ? appliedDate.toISOString() : null, now, applicationId],
    });
  }

  await executeD1Batch(batchStmts);
}

function mapD1Application(
  appRow: Record<string, unknown>,
  docsRows: Record<string, unknown>[],
  notesRows: Record<string, unknown>[],
  historyRows: Record<string, unknown>[]
) {
  return {
    id: String(appRow.id),
    userId: String(appRow.userId),
    companyName: String(appRow.companyName),
    jobTitle: String(appRow.jobTitle),
    applicationReferenceId: appRow.applicationReferenceId ? String(appRow.applicationReferenceId) : null,
    source: String(appRow.source),
    status: String(appRow.status),
    appliedDate: appRow.appliedDate ? new Date(String(appRow.appliedDate)) : null,
    jobUrl: appRow.jobUrl ? String(appRow.jobUrl) : null,
    location: appRow.location ? String(appRow.location) : null,
    salary: appRow.salary ? String(appRow.salary) : null,
    experience: appRow.experience ? String(appRow.experience) : null,
    appliedPlatform: appRow.appliedPlatform ? String(appRow.appliedPlatform) : null,
    jobId: appRow.jobId ? String(appRow.jobId) : null,
    notes: appRow.notes ? String(appRow.notes) : null,
    createdAt: new Date(String(appRow.createdAt)),
    updatedAt: new Date(String(appRow.updatedAt)),
    documents: docsRows.map((d) => ({
      id: String(d.id),
      applicationId: String(d.applicationId),
      fileName: String(d.fileName),
      originalFileName: String(d.originalFileName),
      storageKey: String(d.storageKey),
      fileSize: Number(d.fileSize),
      mimeType: String(d.mimeType),
      tags: String(d.tags || ""),
      uploadedAt: new Date(String(d.uploadedAt)),
    })),
    applicationNotes: notesRows.map((n) => ({
      id: String(n.id),
      applicationId: String(n.applicationId),
      content: String(n.content),
      createdAt: new Date(String(n.createdAt)),
      updatedAt: new Date(String(n.updatedAt)),
    })),
    statusHistory: historyRows.map((h) => ({
      id: String(h.id),
      applicationId: String(h.applicationId),
      previousStatus: h.previousStatus ? String(h.previousStatus) : null,
      newStatus: String(h.newStatus),
      changedAt: h.changedAt ? new Date(String(h.changedAt)) : null,
    })),
  };
}