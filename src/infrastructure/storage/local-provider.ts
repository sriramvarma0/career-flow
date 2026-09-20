import { access, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { StorageObjectInfo, StorageProvider } from "./types";

export class LocalStorageProvider implements StorageProvider {
  private root: string;

  constructor(customRoot?: string) {
    this.root = path.resolve(customRoot || path.join(process.cwd(), "storage"));
  }

  private resolvePath(key: string): string {
    if (!key || typeof key !== "string") {
      throw new Error("Invalid storage key: Key must be a non-empty string.");
    }

    // Reject path traversal indicators and absolute paths
    if (key.includes("..") || path.isAbsolute(key) || key.includes("\0")) {
      throw new Error(`Path traversal security error: Invalid storage key '${key}'`);
    }

    const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
    const resolvedPath = path.resolve(path.join(this.root, normalizedKey));

    if (!resolvedPath.startsWith(this.root)) {
      throw new Error(`Path traversal security error: Key '${key}' escapes storage root.`);
    }

    return resolvedPath;
  }

  async upload(key: string, body: Buffer): Promise<void> {
    const fullPath = this.resolvePath(key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, body);
  }

  async download(key: string): Promise<StorageObjectInfo> {
    const fullPath = this.resolvePath(key);
    if (!(await this.exists(key))) {
      throw new Error(`File not found in local storage: ${key}`);
    }
    const buffer = await readFile(fullPath);
    return {
      stream: buffer,
      contentLength: buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.resolvePath(key);
    if (await this.exists(key)) {
      await unlink(fullPath);
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    const fullPath = this.resolvePath(prefix);
    try {
      await rm(fullPath, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(key);
      await access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
