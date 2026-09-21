import { getD1Config } from "../config/env";

export interface D1QueryResult<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export interface D1Response<T = Record<string, unknown>> {
  result: D1QueryResult<T>[];
  success: boolean;
  errors: { code: number; message: string }[];
  messages: string[];
}

export interface D1Statement {
  sql: string;
  params?: unknown[];
}

function sanitizeParams(params: unknown[] = []): unknown[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (p instanceof Date) return p.toISOString();
    if (typeof p === "boolean") return p ? 1 : 0;
    return p;
  });
}

export async function executeD1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<D1QueryResult<T>> {
  const config = getD1Config();
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sql,
      params: sanitizeParams(params),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare D1 HTTP Error ${response.status}: ${text}`);
  }

  const json: D1Response<T> = await response.json();

  if (!json.success || !json.result || json.result.length === 0) {
    const errorMsg = json.errors && json.errors.length > 0
      ? json.errors.map((e) => e.message).join(", ")
      : "Unknown Cloudflare D1 error";
    throw new Error(`Cloudflare D1 Query Failed: ${errorMsg}`);
  }

  return json.result[0];
}

export async function executeD1Batch(
  statements: D1Statement[]
): Promise<D1QueryResult[]> {
  if (statements.length === 0) return [];
  const config = getD1Config();
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  const payload = statements.map((stmt) => ({
    sql: stmt.sql,
    params: sanitizeParams(stmt.params || []),
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      batch: payload,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare D1 HTTP Batch Error ${response.status}: ${text}`);
  }

  const json: D1Response = await response.json();

  if (!json.success || !json.result) {
    const errorMsg = json.errors && json.errors.length > 0
      ? json.errors.map((e) => e.message).join(", ")
      : "Unknown Cloudflare D1 batch error";
    throw new Error(`Cloudflare D1 Batch Failed: ${errorMsg}`);
  }

  return json.result;
}
