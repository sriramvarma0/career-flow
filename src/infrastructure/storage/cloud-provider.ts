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
  private config: CloudStorageConfig;

  constructor(customConfig?: Partial<CloudStorageConfig>) {
    if (customConfig?.endpoint && customConfig?.bucket && customConfig?.accessKeyId && customConfig?.secretAccessKey) {
      this.config = {
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
      this.config = env.s3;
    }
  }

  private normalizeKey(key: string): string {
    return key.replace(/\\/g, "/").replace(/^\/+/, "");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getS3Client(): Promise<{ s3: any; commands: any }> {
    try {
      const moduleName = "@aws-sdk/client-s3";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const awsSdk: any = await import(/* webpackIgnore: true */ moduleName).catch(() => null);
      if (awsSdk) {
        const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = awsSdk;
        const s3 = new S3Client({
          endpoint: this.config.endpoint,
          region: this.config.region,
          credentials: {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          },
        });
        return {
          s3,
          commands: { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand },
        };
      }
    } catch {
      // S3 SDK not installed
    }
    throw new Error(
      "CloudStorageProvider Error: @aws-sdk/client-s3 package is required for Cloudflare R2 / S3 operations. Please install @aws-sdk/client-s3."
    );
  }

  async upload(key: string, body: Buffer, contentType?: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    const { s3, commands } = await this.getS3Client();
    await s3.send(
      new commands.PutObjectCommand({
        Bucket: this.config.bucket,
        Key: normalizedKey,
        Body: body,
        ContentType: contentType || "application/octet-stream",
      })
    );
  }

  async download(key: string): Promise<StorageObjectInfo> {
    const normalizedKey = this.normalizeKey(key);
    const { s3, commands } = await this.getS3Client();
    const response = await s3.send(
      new commands.GetObjectCommand({
        Bucket: this.config.bucket,
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
    const { s3, commands } = await this.getS3Client();
    await s3.send(
      new commands.DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: normalizedKey,
      })
    );
  }

  async exists(key: string): Promise<boolean> {
    const normalizedKey = this.normalizeKey(key);
    try {
      const { s3, commands } = await this.getS3Client();
      await s3.send(
        new commands.HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: normalizedKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
