import { prisma } from "@/infrastructure/database/prisma";

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { contacts: true },
  });
}

export async function getUserByNormalizedContact(normalizedValue: string) {
  return prisma.userContact.findUnique({
    where: { normalizedValue },
    include: { user: true },
  });
}