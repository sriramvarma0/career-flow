export interface AppEnvConfig {
  storageProvider: "local" | "cloud";
  s3?: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

let cachedStorageConfig: AppEnvConfig | null = null;

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "Configuration Error: DATABASE_URL environment variable is missing. Check your .env file or environment settings."
    );
  }
  return databaseUrl;
}

export function getEnvConfig(): AppEnvConfig {
  if (cachedStorageConfig) {
    return cachedStorageConfig;
  }

  const rawStorageProvider = (process.env.STORAGE_PROVIDER || "local").toLowerCase().trim();

  if (rawStorageProvider !== "local" && rawStorageProvider !== "cloud" && rawStorageProvider !== "r2" && rawStorageProvider !== "s3") {
    throw new Error(
      `Configuration Error: Invalid STORAGE_PROVIDER '${rawStorageProvider}'. Must be 'local' or 'cloud'.`
    );
  }

  const storageProvider: "local" | "cloud" =
    rawStorageProvider === "cloud" || rawStorageProvider === "r2" || rawStorageProvider === "s3"
      ? "cloud"
      : "local";

  if (storageProvider === "cloud") {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || "auto";
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

    const missingVars: string[] = [];
    if (!endpoint) missingVars.push("S3_ENDPOINT");
    if (!bucket) missingVars.push("S3_BUCKET");
    if (!accessKeyId) missingVars.push("S3_ACCESS_KEY_ID");
    if (!secretAccessKey) missingVars.push("S3_SECRET_ACCESS_KEY");

    if (missingVars.length > 0) {
      throw new Error(
        `Configuration Error: STORAGE_PROVIDER is set to 'cloud', but the following required environment variables are missing: ${missingVars.join(
          ", "
        )}. Configure these variables or set STORAGE_PROVIDER=local.`
      );
    }

    cachedStorageConfig = {
      storageProvider: "cloud",
      s3: {
        endpoint: endpoint!,
        region,
        bucket: bucket!,
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    };
  } else {
    cachedStorageConfig = {
      storageProvider: "local",
    };
  }

  return cachedStorageConfig;
}
