export interface StorageObjectInfo {
  stream: ReadableStream | Buffer;
  contentType?: string;
  contentLength?: number;
}

export interface StorageProvider {
  upload(key: string, body: Buffer, contentType?: string): Promise<void>;
  download(key: string): Promise<StorageObjectInfo>;
  delete(key: string): Promise<void>;
  deletePrefix?(prefix: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
