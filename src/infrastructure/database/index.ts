import { getDatabaseProvider } from "../config/env";

export function isD1Provider(): boolean {
  return getDatabaseProvider() === "d1";
}

export function isSqliteProvider(): boolean {
  return getDatabaseProvider() === "sqlite";
}

export * from "./prisma";
export * from "./d1-client";
