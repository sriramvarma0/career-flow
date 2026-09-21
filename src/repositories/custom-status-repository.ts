import { prisma } from "@/infrastructure/database/prisma";
import { executeD1Query } from "@/infrastructure/database/d1-client";
import { getDatabaseProvider } from "@/infrastructure/config/env";
import { randomUUID } from "node:crypto";

export interface CustomStatusRecord {
  id?: string;
  userId?: string;
  name: string;
  linkedStatus: string;
}

export async function getCustomStatuses(userId: string): Promise<CustomStatusRecord[]> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.customStatus.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { name: true, linkedStatus: true },
    });
  }

  const res = await executeD1Query<Record<string, unknown>>(
    `SELECT name, linkedStatus FROM CustomStatus WHERE userId = ? ORDER BY createdAt ASC`,
    [userId]
  );
  return (res.results || []).map((row) => ({
    name: String(row.name),
    linkedStatus: String(row.linkedStatus),
  }));
}

export async function createCustomStatus(
  userId: string,
  name: string,
  linkedStatus: string
): Promise<CustomStatusRecord> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const existing = await prisma.customStatus.findUnique({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.customStatus.create({
      data: {
        userId,
        name,
        linkedStatus,
      },
    });
  }

  const existingRes = await executeD1Query<Record<string, unknown>>(
    `SELECT name, linkedStatus FROM CustomStatus WHERE userId = ? AND name = ? LIMIT 1`,
    [userId, name]
  );
  if (existingRes.results?.[0]) {
    return {
      name: String(existingRes.results[0].name),
      linkedStatus: String(existingRes.results[0].linkedStatus),
    };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await executeD1Query(
    `INSERT INTO CustomStatus (id, userId, name, linkedStatus, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, name, linkedStatus, now]
  );

  return { name, linkedStatus };
}
