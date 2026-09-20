import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { StorageObjectInfo, StorageProvider } from "./types";
import { getEnvConfig } from "../config/env";

export interface CloudStorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class CloudStorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(customConfig?: Partial<CloudStorageConfig>) {
    let config: CloudStorageConfig;

    if (customConfig?.endpoint && customConfig?.bucket && customConfig?.accessKeyId && customConfig?.secretAccessKey) {
      config = {
        endpoint: customConfig.endpoint,
        region: customConfig.region || "auto",
        bucket: customConfig.bucket,
        accessKeyId: customConfig.accessKeyId,
        secretAccessKey: customConfig.secretAccessKey,
      };
    } else {
      const env = getEnvConfig();
      if (env.storageProvider !== "cloud" || !env.s3) {
        throw new Error(
          "CloudStorageProvider Error: STORAGE_PROVIDER is not set to 'cloud' or cloud environment configuration is incomplete."
        );
      }
      config = env.s3;
    }

    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private normalizeKey(key: string): string {
    return key.replace(/\\/g, "/").replace(/^\/+/, "");
  }

  async upload(key: string, body: Buffer, contentType?: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
        Body: body,
        ContentType: contentType || "application/octet-stream",
      })
    );
  }

  async download(key: string): Promise<StorageObjectInfo> {
    const normalizedKey = this.normalizeKey(key);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
      })
    );

    const byteArray = await response.Body?.transformToByteArray();
    const buffer = Buffer.from(byteArray || new Uint8Array());

    return {
      stream: buffer,
      contentType: response.ContentType,
      contentLength: response.ContentLength || buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
      })
    );
  }

  async exists(key: string): Promise<boolean> {
    const normalizedKey = this.normalizeKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: normalizedKey,
        })
      );
      return true;
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        err?.name === "NotFound" ||
        err?.name === "NoSuchKey" ||
        err?.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }
}
