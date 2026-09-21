import { prisma } from "@/infrastructure/database/prisma";
import { executeD1Query } from "@/infrastructure/database/d1-client";
import { getDatabaseProvider } from "@/infrastructure/config/env";
import { randomUUID } from "node:crypto";

export interface DocumentRecord {
  id: string;
  applicationId: string;
  fileName: string;
  originalFileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  tags: string;
  uploadedAt: Date;
  application?: {
    id: string;
    companyName: string;
    jobTitle: string;
    userId: string;
  };
}

export async function listDocumentsForUser(userId: string): Promise<{
  id: string;
  companyName: string;
  jobTitle: string;
  status: string;
  documents: DocumentRecord[];
}[]> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const apps = await prisma.application.findMany({
      where: { userId },
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        status: true,
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return apps as unknown as {
      id: string;
      companyName: string;
      jobTitle: string;
      status: string;
      documents: DocumentRecord[];
    }[];
  }

  const appsRes = await executeD1Query<Record<string, unknown>>(
    `SELECT id, companyName, jobTitle, status FROM Application WHERE userId = ? ORDER BY createdAt DESC`,
    [userId]
  );
  const apps = appsRes.results || [];

  return Promise.all(
    apps.map(async (app) => {
      const appId = String(app.id);
      const docsRes = await executeD1Query<Record<string, unknown>>(
        `SELECT * FROM Document WHERE applicationId = ? ORDER BY uploadedAt DESC`,
        [appId]
      );
      return {
        id: appId,
        companyName: String(app.companyName),
        jobTitle: String(app.jobTitle),
        status: String(app.status || "Applied"),
        documents: (docsRes.results || []).map((d) => ({
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
      };
    })
  );
}

export async function getDocumentById(userId: string, documentId: string): Promise<DocumentRecord | null> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, application: { userId } },
      include: {
        application: {
          select: { id: true, companyName: true, jobTitle: true, userId: true },
        },
      },
    });
    return doc as unknown as DocumentRecord | null;
  }

  const docRes = await executeD1Query<Record<string, unknown>>(
    `SELECT d.*, a.companyName, a.jobTitle, a.userId FROM Document d JOIN Application a ON d.applicationId = a.id WHERE d.id = ? AND a.userId = ? LIMIT 1`,
    [documentId, userId]
  );
  const row = docRes.results?.[0];
  if (!row) return null;

  return {
    id: String(row.id),
    applicationId: String(row.applicationId),
    fileName: String(row.fileName),
    originalFileName: String(row.originalFileName),
    storageKey: String(row.storageKey),
    fileSize: Number(row.fileSize),
    mimeType: String(row.mimeType),
    tags: String(row.tags || ""),
    uploadedAt: new Date(String(row.uploadedAt)),
    application: {
      id: String(row.applicationId),
      companyName: String(row.companyName),
      jobTitle: String(row.jobTitle),
      userId: String(row.userId),
    },
  };
}

export async function getDocumentsForApplication(userId: string, applicationId: string): Promise<DocumentRecord[]> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const docs = await prisma.document.findMany({
      where: { applicationId, application: { userId } },
    });
    return docs as unknown as DocumentRecord[];
  }

  const docsRes = await executeD1Query<Record<string, unknown>>(
    `SELECT d.* FROM Document d JOIN Application a ON d.applicationId = a.id WHERE d.applicationId = ? AND a.userId = ?`,
    [applicationId, userId]
  );

  return (docsRes.results || []).map((d) => ({
    id: String(d.id),
    applicationId: String(d.applicationId),
    fileName: String(d.fileName),
    originalFileName: String(d.originalFileName),
    storageKey: String(d.storageKey),
    fileSize: Number(d.fileSize),
    mimeType: String(d.mimeType),
    tags: String(d.tags || ""),
    uploadedAt: new Date(String(d.uploadedAt)),
  }));
}

export async function createDocument(data: {
  applicationId: string;
  fileName: string;
  originalFileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  tags: string;
}) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.document.create({
      data: {
        applicationId: data.applicationId,
        fileName: data.fileName,
        originalFileName: data.originalFileName,
        storageKey: data.storageKey,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        tags: data.tags,
      },
    });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await executeD1Query(
    `INSERT INTO Document (id, applicationId, fileName, originalFileName, storageKey, fileSize, mimeType, tags, uploadedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.applicationId, data.fileName, data.originalFileName, data.storageKey, data.fileSize, data.mimeType, data.tags, now]
  );
  return { id };
}

export async function deleteDocument(documentId: string) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.document.delete({ where: { id: documentId } });
  }

  await executeD1Query(`DELETE FROM Document WHERE id = ?`, [documentId]);
}

export async function addApplicationNote(applicationId: string, content: string) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.applicationNote.create({
      data: {
        applicationId,
        content,
      },
    });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await executeD1Query(
    `INSERT INTO ApplicationNote (id, applicationId, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
    [id, applicationId, content, now, now]
  );
  return { id };
}

export async function getUsedTags(userId: string): Promise<string[]> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const documents = await prisma.document.findMany({
      where: {
        application: {
          userId,
        },
      },
      select: {
        tags: true,
      },
    });

    const uniqueTags = new Set<string>();
    documents.forEach((doc) => {
      if (doc.tags) {
        doc.tags.split(",").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) uniqueTags.add(trimmed);
        });
      }
    });

    return Array.from(uniqueTags);
  }

  const res = await executeD1Query<Record<string, unknown>>(
    `SELECT d.tags FROM Document d JOIN Application a ON d.applicationId = a.id WHERE a.userId = ?`,
    [userId]
  );

  const uniqueTags = new Set<string>();
  (res.results || []).forEach((row) => {
    const tags = String(row.tags || "");
    if (tags) {
      tags.split(",").forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) uniqueTags.add(trimmed);
      });
    }
  });

  return Array.from(uniqueTags);
}
