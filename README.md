# CareerFlow

CareerFlow is a modern job search and career tracking application built with Next.js, Prisma, and NextAuth.

---

## Data Layer & Infrastructure Architecture

The application's data layer and infrastructure are completely isolated from business logic, ensuring that source code can be safely published to a public GitHub repository and deployed via CI/CD into production environments.

### Architecture Diagram

```text
                               CareerFlow Next.js UI / API
                                           |
                                           v
                                   Application Actions
                                           |
                                           v
                                        Services
                                           |
                                           v
                                      Repositories
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v                                               v
        Infrastructure/Database                         Infrastructure/Storage
                   |                                               |
             Prisma Client                                  StorageProvider
                   |                                               |
             SQLite Engine                          +--------------+--------------+
                   |                                |                             |
                   v                                v                             v
          data/database/dev.db             LocalStorageProvider         CloudStorageProvider
                                                    |                             |
                                                    v                             v
                                              storage/                      Cloudflare R2
                                           (Local Filesystem)             (S3-Compatible API)
```

---

### 1. Database Architecture

* **Engine**: SQLite managed via Prisma ORM (`src/infrastructure/database/prisma.ts`).
* **Runtime Path**: `data/database/dev.db` (configured via `DATABASE_URL`).
* **Prisma Relative Path**: `DATABASE_URL="file:../data/database/dev.db"` (evaluated relative to `prisma/schema.prisma`).
* **Git Isolation**: The repository tracks only a `.gitkeep` placeholder in `data/database/`. Actual `.db` database files are excluded from Git (`.gitignore`).
* **Production Deployment Note**: Production deployment with SQLite requires a **persistent volume** mounted to `data/database/` (SQLite databases will not persist on ephemeral container filesystems).

### 2. SQLite Backup Architecture

* **Runtime Path**: `data/backups/`
* **Schedule & Retention**: Automatic hourly snapshot backups during active local development, retaining up to the 10 most recent backups (`dev-backup-<timestamp>.db`).
* **Git Isolation**: Only `data/backups/.gitkeep` is tracked. All runtime `.db` backups are ignored by Git.
* **Restore Command**: Run `npm run db:restore` (executes `scripts/database/restore-backup.js`) to restore the database to the latest snapshot in `data/backups/`.

---

### 3. Document Storage Architecture

Document storage is decoupled from application/business logic via the `StorageProvider` interface (`src/infrastructure/storage/types.ts`). Business logic never directly calls `fs` or cloud APIs.

#### Storage Provider Implementations

1. **`LocalStorageProvider`** (`STORAGE_PROVIDER=local`):
   * Used for local development and testing.
   * Stores files on local disk under `storage/` (`storage/users/user_<userId>/application_<appId>/<fileName>`).
   * Enforces strict path traversal security checks (rejects keys with `..`, absolute paths, or unsafe escapes).
   * `storage/` contains only `.gitkeep` in Git; user uploaded files are completely ignored.

2. **`CloudStorageProvider`** (`STORAGE_PROVIDER=cloud`):
   * Designed for production deployment using **Cloudflare R2** (or AWS S3 / S3-compatible object storage).
   * Communicates with S3-compatible APIs using bucket name, credentials, and endpoint configuration.
   * Enforces configuration validation: if `STORAGE_PROVIDER=cloud` is set without valid cloud credentials, it throws an explicit configuration error rather than silently falling back to local storage.

#### Provider Selection Factory

Centralized provider resolution in `src/infrastructure/storage/index.ts`:

```ts
import { getStorageProvider } from "@/infrastructure/storage";
const storage = getStorageProvider();
```

---

### 4. Storage Keys vs. File Paths

The database stores provider-independent **`storageKey`** strings instead of OS-dependent absolute file paths.

* **Bad (Old)**: `C:\codebase\career-flow\storage\users\user_123\application_456\resume.pdf`
* **Good (Current)**: `users/user_123/application_456/1781902393036-resume.pdf`

The logical `storageKey` uniquely identifies the document object regardless of whether it resides in local disk storage or Cloudflare R2.

---

## Environment Configuration

Environment variables are validated on startup by `src/infrastructure/config/env.ts`.

Copy `.env.example` to `.env` and fill in required values:

```env
# Database Configuration (SQLite)
DATABASE_URL="file:../data/database/dev.db"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Storage Provider Selection: "local" or "cloud"
STORAGE_PROVIDER="local"

# Cloudflare R2 / AWS S3 Configuration (Required when STORAGE_PROVIDER="cloud")
S3_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="career-flow-documents"
S3_ACCESS_KEY_ID="<your-access-key-id>"
S3_SECRET_ACCESS_KEY="<your-secret-access-key>"
```

---

## Local Development Quickstart

1. **Clone repository & install dependencies**:
   ```bash
   git clone <repo-url>
   cd career-flow
   npm install
   ```

2. **Set up local environment**:
   ```bash
   cp .env.example .env
   ```

3. **Initialize Prisma database**:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Migrate existing storage keys (if restoring legacy database)**:
   ```bash
   # Test in dry-run mode:
   npx tsx scripts/storage/migrate-storage-keys.js --dry-run

   # Run live migration:
   npx tsx scripts/storage/migrate-storage-keys.js
   ```

5. **Run Storage Provider Tests**:
   ```bash
   npx tsx scripts/storage/test-storage.js
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

---

## Production Setup Guide (Cloudflare R2 & CI/CD)

### 1. Cloudflare R2 Bucket Setup
1. Log in to Cloudflare Dashboard -> **R2 Object Storage**.
2. Click **Create Bucket** (e.g. `career-flow-documents`).
3. Under **Account Details / Manage R2 API Tokens**, click **Create API Token**.
4. Grant **Edit** permissions to the bucket.
5. Copy the **S3 API Endpoint**, **Access Key ID**, and **Secret Access Key**.

### 2. CI/CD & Production Environment Setup
1. Configure environment variables on your production server or hosting platform:
   * `DATABASE_URL`: `"file:../data/database/production.db"`
   * `STORAGE_PROVIDER`: `"cloud"`
   * `S3_ENDPOINT`: `https://<accountid>.r2.cloudflarestorage.com`
   * `S3_REGION`: `"auto"`
   * `S3_BUCKET`: `"career-flow-documents"`
   * `S3_ACCESS_KEY_ID`: `<R2_ACCESS_KEY_ID>`
   * `S3_SECRET_ACCESS_KEY`: `<R2_SECRET_ACCESS_KEY>`

2. Install S3 client in production if using cloud storage:
   ```bash
   npm install @aws-sdk/client-s3
   ```

3. In your CI/CD build pipeline:
   ```bash
   npm ci
   npx prisma generate
   npm run build
   ```

4. Runtime database files in `data/database/` and documents in Cloudflare R2 are persisted across deployments outside of Git tracking.
