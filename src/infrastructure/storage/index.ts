import { LocalStorageProvider } from "./local-provider";
import { CloudStorageProvider } from "./cloud-provider";
import { StorageProvider } from "./types";
import { getEnvConfig } from "../config/env";

let providerInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const env = getEnvConfig();

  if (env.storageProvider === "cloud") {
    providerInstance = new CloudStorageProvider();
  } else {
    providerInstance = new LocalStorageProvider();
  }

  return providerInstance;
}

export function getStorageKey(userId: string, applicationId: string, fileName: string): string {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `users/user_${userId}/application_${applicationId}/${safeFileName}`;
}

export * from "./types";
export * from "./local-provider";
export * from "./cloud-provider";
