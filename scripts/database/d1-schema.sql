-- Cloudflare D1 Database Schema for CareerFlow
-- Derived directly from prisma/schema.prisma

-- User table
CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    fullName TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UserContact table
CREATE TABLE IF NOT EXISTS UserContact (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    normalizedValue TEXT NOT NULL UNIQUE,
    isPrimary BOOLEAN NOT NULL DEFAULT 0,
    isVerified BOOLEAN NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_contact_user_id_type ON UserContact(userId, type);

-- Application table
CREATE TABLE IF NOT EXISTS Application (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    companyName TEXT NOT NULL,
    jobTitle TEXT NOT NULL,
    applicationReferenceId TEXT,
    source TEXT NOT NULL DEFAULT 'Other',
    status TEXT NOT NULL DEFAULT 'Applied',
    appliedDate DATETIME,
    jobUrl TEXT,
    location TEXT,
    salary TEXT,
    experience TEXT,
    appliedPlatform TEXT,
    jobId TEXT,
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_user_id_status ON Application(userId, status);
CREATE INDEX IF NOT EXISTS idx_application_company_name ON Application(companyName);
CREATE INDEX IF NOT EXISTS idx_application_job_title ON Application(jobTitle);
CREATE INDEX IF NOT EXISTS idx_application_reference_id ON Application(applicationReferenceId);

-- Document table
CREATE TABLE IF NOT EXISTS Document (
    id TEXT PRIMARY KEY,
    applicationId TEXT NOT NULL,
    fileName TEXT NOT NULL,
    originalFileName TEXT NOT NULL,
    storageKey TEXT NOT NULL,
    fileSize INTEGER NOT NULL,
    mimeType TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '',
    uploadedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicationId) REFERENCES Application(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_application_id ON Document(applicationId);

-- ApplicationNote table
CREATE TABLE IF NOT EXISTS ApplicationNote (
    id TEXT PRIMARY KEY,
    applicationId TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicationId) REFERENCES Application(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_note_application_id ON ApplicationNote(applicationId);

-- StatusHistory table
CREATE TABLE IF NOT EXISTS StatusHistory (
    id TEXT PRIMARY KEY,
    applicationId TEXT NOT NULL,
    previousStatus TEXT,
    newStatus TEXT NOT NULL,
    changedAt DATETIME,
    FOREIGN KEY (applicationId) REFERENCES Application(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_status_history_application_id ON StatusHistory(applicationId);

-- PasswordResetToken table
CREATE TABLE IF NOT EXISTS PasswordResetToken (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    tokenHash TEXT NOT NULL UNIQUE,
    expiresAt DATETIME NOT NULL,
    usedAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_user_id ON PasswordResetToken(userId);

-- CustomStatus table
CREATE TABLE IF NOT EXISTS CustomStatus (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    linkedStatus TEXT NOT NULL DEFAULT 'Applied',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    CONSTRAINT uq_custom_status_user_id_name UNIQUE (userId, name)
);

CREATE INDEX IF NOT EXISTS idx_custom_status_user_id ON CustomStatus(userId);
