import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { comparePassword } from "@/lib/password";
import { prisma } from "@/infrastructure/database/prisma";
import { loginSchema } from "@/lib/validators";
import { normalizeContactValue } from "@/lib/utils";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const identifier = parsed.data.identifier.trim();
        const normalizedIdentifier = identifier.includes("@")
          ? normalizeContactValue(identifier, "EMAIL")
          : normalizeContactValue(identifier, "PHONE");

        const contact = await prisma.userContact.findUnique({
          where: {
            normalizedValue: normalizedIdentifier,
          },
          include: {
            user: {
              include: {
                contacts: true,
              },
            },
          },
        });

        if (!contact) {
          return null;
        }

        const passwordMatches = await comparePassword(parsed.data.password, contact.user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        const primaryEmail = contact.user.contacts.find((entry) => entry.type === "EMAIL" && entry.isPrimary) ?? contact.user.contacts.find((entry) => entry.type === "EMAIL");

        return {
          id: contact.user.id,
          name: contact.user.fullName,
          email: primaryEmail?.value ?? contact.value,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }

      return session;
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}