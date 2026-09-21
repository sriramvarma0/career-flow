import { prisma } from "@/infrastructure/database/prisma";
import { executeD1Query, executeD1Batch } from "@/infrastructure/database/d1-client";
import { getDatabaseProvider } from "@/infrastructure/config/env";
import { randomUUID } from "node:crypto";

export interface UserContactRecord {
  id: string;
  userId: string;
  type: "EMAIL" | "PHONE";
  value: string;
  normalizedValue: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord {
  id: string;
  fullName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  contacts: UserContactRecord[];
}

export interface UserContactWithUser extends UserContactRecord {
  user: UserRecord;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  user?: UserRecord;
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { contacts: true },
    });
    if (!user) return null;
    return {
      ...user,
      contacts: user.contacts || [],
    };
  }

  const res = await executeD1Query<Record<string, unknown>>(
    `SELECT id, fullName, passwordHash, createdAt, updatedAt FROM User WHERE id = ? LIMIT 1`,
    [userId]
  );
  const row = res.results?.[0];
  if (!row) return null;

  const contactsRes = await executeD1Query<Record<string, unknown>>(
    `SELECT id, userId, type, value, normalizedValue, isPrimary, isVerified, createdAt, updatedAt FROM UserContact WHERE userId = ?`,
    [userId]
  );

  return {
    id: String(row.id),
    fullName: String(row.fullName),
    passwordHash: String(row.passwordHash),
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
    contacts: (contactsRes.results || []).map((c) => ({
      id: String(c.id),
      userId: String(c.userId),
      type: c.type as "EMAIL" | "PHONE",
      value: String(c.value),
      normalizedValue: String(c.normalizedValue),
      isPrimary: Boolean(c.isPrimary),
      isVerified: Boolean(c.isVerified),
      createdAt: new Date(String(c.createdAt)),
      updatedAt: new Date(String(c.updatedAt)),
    })),
  };
}

export async function getUserByNormalizedContact(normalizedValue: string): Promise<UserContactWithUser | null> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const contact = await prisma.userContact.findUnique({
      where: { normalizedValue },
      include: {
        user: {
          include: {
            contacts: true,
          },
        },
      },
    });
    return contact as unknown as UserContactWithUser | null;
  }

  const contactRes = await executeD1Query<Record<string, unknown>>(
    `SELECT id, userId, type, value, normalizedValue, isPrimary, isVerified, createdAt, updatedAt FROM UserContact WHERE normalizedValue = ? LIMIT 1`,
    [normalizedValue]
  );
  const contactRow = contactRes.results?.[0];
  if (!contactRow) return null;

  const user = await getUserById(String(contactRow.userId));
  if (!user) return null;

  return {
    id: String(contactRow.id),
    userId: String(contactRow.userId),
    type: contactRow.type as "EMAIL" | "PHONE",
    value: String(contactRow.value),
    normalizedValue: String(contactRow.normalizedValue),
    isPrimary: Boolean(contactRow.isPrimary),
    isVerified: Boolean(contactRow.isVerified),
    createdAt: new Date(String(contactRow.createdAt)),
    updatedAt: new Date(String(contactRow.updatedAt)),
    user,
  };
}

export async function findExistingContactForRegistration(normalizedEmail: string, normalizedPhone: string) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.userContact.findFirst({
      where: {
        OR: [{ normalizedValue: normalizedEmail }, { normalizedValue: normalizedPhone }],
      },
    });
  }

  const res = await executeD1Query<Record<string, unknown>>(
    `SELECT id FROM UserContact WHERE normalizedValue = ? OR normalizedValue = ? LIMIT 1`,
    [normalizedEmail, normalizedPhone]
  );
  return res.results?.[0] ? { id: String(res.results[0].id) } : null;
}

export async function createUserWithContacts(data: {
  fullName: string;
  passwordHash: string;
  primaryEmail: string;
  normalizedEmail: string;
  primaryPhone: string;
  normalizedPhone: string;
}): Promise<{ id: string }> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        contacts: {
          create: [
            {
              type: "EMAIL",
              value: data.primaryEmail,
              normalizedValue: data.normalizedEmail,
              isPrimary: true,
              isVerified: false,
            },
            {
              type: "PHONE",
              value: data.primaryPhone,
              normalizedValue: data.normalizedPhone,
              isPrimary: true,
              isVerified: false,
            },
          ],
        },
      },
    });

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    return { id: user.id };
  }

  const userId = randomUUID();
  const emailContactId = randomUUID();
  const phoneContactId = randomUUID();
  const now = new Date().toISOString();

  await executeD1Batch([
    {
      sql: `INSERT INTO User (id, fullName, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      params: [userId, data.fullName, data.passwordHash, now, now],
    },
    {
      sql: `INSERT INTO UserContact (id, userId, type, value, normalizedValue, isPrimary, isVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [emailContactId, userId, "EMAIL", data.primaryEmail, data.normalizedEmail, 1, 0, now, now],
    },
    {
      sql: `INSERT INTO UserContact (id, userId, type, value, normalizedValue, isPrimary, isVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [phoneContactId, userId, "PHONE", data.primaryPhone, data.normalizedPhone, 1, 0, now, now],
    },
    {
      sql: `DELETE FROM PasswordResetToken WHERE userId = ?`,
      params: [userId],
    },
  ]);

  return { id: userId };
}

export async function createPasswordResetToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await executeD1Query(
    `INSERT INTO PasswordResetToken (id, userId, tokenHash, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [id, data.userId, data.tokenHash, data.expiresAt.toISOString(), now]
  );
  return { id };
}

export async function findPasswordResetToken(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    return token as unknown as PasswordResetTokenRecord | null;
  }

  const res = await executeD1Query<Record<string, unknown>>(
    `SELECT id, userId, tokenHash, expiresAt, usedAt, createdAt FROM PasswordResetToken WHERE tokenHash = ? LIMIT 1`,
    [tokenHash]
  );
  const row = res.results?.[0];
  if (!row) return null;

  const user = await getUserById(String(row.userId));

  return {
    id: String(row.id),
    userId: String(row.userId),
    tokenHash: String(row.tokenHash),
    expiresAt: new Date(String(row.expiresAt)),
    usedAt: row.usedAt ? new Date(String(row.usedAt)) : null,
    createdAt: new Date(String(row.createdAt)),
    user: user || undefined,
  };
}

export async function consumePasswordResetToken(tokenHash: string, newPasswordHash: string) {
  const resetToken = await findPasswordResetToken(tokenHash);
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return false;
  }

  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return true;
  }

  const now = new Date().toISOString();
  await executeD1Batch([
    {
      sql: `UPDATE User SET passwordHash = ?, updatedAt = ? WHERE id = ?`,
      params: [newPasswordHash, now, resetToken.userId],
    },
    {
      sql: `UPDATE PasswordResetToken SET usedAt = ? WHERE id = ?`,
      params: [now, resetToken.id],
    },
  ]);
  return true;
}

export async function updateUserProfile(userId: string, fullName: string) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.user.update({
      where: { id: userId },
      data: { fullName },
    });
  }

  const now = new Date().toISOString();
  await executeD1Query(
    `UPDATE User SET fullName = ?, updatedAt = ? WHERE id = ?`,
    [fullName, now, userId]
  );
}

export async function findExistingContact(normalizedValue: string, excludeId?: string) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    return prisma.userContact.findFirst({
      where: {
        normalizedValue,
        NOT: { id: excludeId },
      },
    });
  }

  const sql = excludeId
    ? `SELECT id FROM UserContact WHERE normalizedValue = ? AND id != ? LIMIT 1`
    : `SELECT id FROM UserContact WHERE normalizedValue = ? LIMIT 1`;
  const params = excludeId ? [normalizedValue, excludeId] : [normalizedValue];

  const res = await executeD1Query<Record<string, unknown>>(sql, params);
  return res.results?.[0] ? { id: String(res.results[0].id) } : null;
}

export async function upsertUserContact(data: {
  id?: string;
  userId: string;
  type: "EMAIL" | "PHONE";
  value: string;
  normalizedValue: string;
  isPrimary: boolean;
  isVerified: boolean;
}) {
  const provider = getDatabaseProvider();
  if (provider === "sqlite") {
    if (data.id) {
      return prisma.userContact.update({
        where: { id: data.id },
        data: {
          type: data.type,
          value: data.value,
          normalizedValue: data.normalizedValue,
          isPrimary: data.isPrimary,
          isVerified: data.isVerified,
        },
      });
    } else {
      return prisma.userContact.create({
        data: {
          userId: data.userId,
          type: data.type,
          value: data.value,
          normalizedValue: data.normalizedValue,
          isPrimary: data.isPrimary,
          isVerified: data.isVerified,
        },
      });
    }
  }

  const now = new Date().toISOString();
  if (data.id) {
    await executeD1Query(
      `UPDATE UserContact SET type = ?, value = ?, normalizedValue = ?, isPrimary = ?, isVerified = ?, updatedAt = ? WHERE id = ?`,
      [data.type, data.value, data.normalizedValue, data.isPrimary ? 1 : 0, data.isVerified ? 1 : 0, now, data.id]
    );
  } else {
    const contactId = randomUUID();
    await executeD1Query(
      `INSERT INTO UserContact (id, userId, type, value, normalizedValue, isPrimary, isVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [contactId, data.userId, data.type, data.value, data.normalizedValue, data.isPrimary ? 1 : 0, data.isVerified ? 1 : 0, now, now]
    );
  }
}