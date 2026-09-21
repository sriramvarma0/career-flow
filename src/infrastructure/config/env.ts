export interface AppEnvConfig {
  databaseProvider: "sqlite" | "d1";
  storageProvider: "local" | "cloud";
  d1?: {
    accountId: string;
    databaseId: string;
    apiToken: string;
  };
  s3?: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

let cachedAppConfig: AppEnvConfig | null = null;

export function getDatabaseProvider(): "sqlite" | "d1" {
  const provider = (process.env.DATABASE_PROVIDER || "sqlite").toLowerCase().trim();
  if (provider !== "sqlite" && provider !== "d1") {
    throw new Error(
      `Configuration Error: Invalid DATABASE_PROVIDER '${provider}'. Must be 'sqlite' or 'd1'.`
    );
  }
  return provider;
}

export function getDatabaseUrl(): string {
  const provider = getDatabaseProvider();
  if (provider === "d1") {
    throw new Error(
      "Configuration Error: DATABASE_URL was requested, but DATABASE_PROVIDER is set to 'd1'. Local SQLite file is not required or used for D1."
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "Configuration Error: DATABASE_URL environment variable is missing. Check your .env file or environment settings."
    );
  }
  return databaseUrl;
}

export function getD1Config(): { accountId: string; databaseId: string; apiToken: string } {
  const provider = getDatabaseProvider();
  if (provider !== "d1") {
    throw new Error(
      "Configuration Error: D1 configuration requested while DATABASE_PROVIDER is not set to 'd1'."
    );
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  const missingVars: string[] = [];
  if (!accountId) missingVars.push("CLOUDFLARE_ACCOUNT_ID");
  if (!databaseId) missingVars.push("CLOUDFLARE_DATABASE_ID");
  if (!apiToken) missingVars.push("CLOUDFLARE_API_TOKEN");

  if (missingVars.length > 0) {
    throw new Error(
      `Configuration Error: DATABASE_PROVIDER is set to 'd1', but the following required Cloudflare D1 environment variables are missing: ${missingVars.join(
        ", "
      )}.`
    );
  }

  return { accountId: accountId!, databaseId: databaseId!, apiToken: apiToken! };
}

export function getEnvConfig(): AppEnvConfig {
  if (cachedAppConfig) {
    return cachedAppConfig;
  }

  const databaseProvider = getDatabaseProvider();
  let d1Config: { accountId: string; databaseId: string; apiToken: string } | undefined;

  if (databaseProvider === "d1") {
    d1Config = getD1Config();
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

    cachedAppConfig = {
      databaseProvider,
      storageProvider: "cloud",
      d1: d1Config,
      s3: {
        endpoint: endpoint!,
        region,
        bucket: bucket!,
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    };
  } else {
    cachedAppConfig = {
      databaseProvider,
      storageProvider: "local",
      d1: d1Config,
    };
  }

  return cachedAppConfig;
}

