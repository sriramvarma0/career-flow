import { getEnvConfig, getDatabaseProvider } from "../../src/infrastructure/config/env";
import {
  getUserById,
  findExistingContactForRegistration,
  createUserWithContacts,
  createPasswordResetToken,
  findPasswordResetToken,
  consumePasswordResetToken,
} from "../../src/repositories/user-repository";
import {
  listApplications,
  createApplication,
  getApplicationById,
  updateApplicationWithTimeline,
  deleteApplication,
} from "../../src/repositories/application-repository";
import {
  getCustomStatuses,
  createCustomStatus,
} from "../../src/repositories/custom-status-repository";
import {
  createDocument,
  listDocumentsForUser,
  getDocumentsForApplication,
  deleteDocument,
} from "../../src/repositories/document-repository";
import { prisma } from "../../src/infrastructure/database/prisma";
import { randomUUID } from "node:crypto";

async function testSqliteProvider() {
  console.log("\n==========================================");
  console.log("TEST 1: Testing DATABASE_PROVIDER=sqlite");
  console.log("==========================================");

  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_URL = "file:../data/database/dev.db";

  const provider = getDatabaseProvider();
  if (provider !== "sqlite") {
    throw new Error(`Expected provider 'sqlite', got '${provider}'`);
  }
  console.log("✓ Provider correctly identified as 'sqlite'");

  // Test User Creation
  const testEmail = `test_${Date.now()}@example.com`;
  const testPhone = `+1555${Math.floor(100000 + Math.random() * 900000)}`;

  const existing = await findExistingContactForRegistration(testEmail, testPhone);
  if (existing) {
    throw new Error("Unexpected existing contact for test user");
  }
  console.log("✓ Checked for existing registration contact");

  const createdUser = await createUserWithContacts({
    fullName: "SQLite Test User",
    passwordHash: "hashed_test_pass",
    primaryEmail: testEmail,
    normalizedEmail: testEmail.toUpperCase(),
    primaryPhone: testPhone,
    normalizedPhone: testPhone,
  });
  console.log(`✓ User created with ID: ${createdUser.id}`);

  const user = await getUserById(createdUser.id);
  if (!user || user.fullName !== "SQLite Test User") {
    throw new Error("Failed to fetch created user by ID");
  }
  console.log(`✓ Fetched user: ${user.fullName} with ${user.contacts.length} contacts`);

  // Test Password Reset Token transaction
  const resetTokenHash = `hash_${randomUUID()}`;
  await createPasswordResetToken({
    userId: user.id,
    tokenHash: resetTokenHash,
    expiresAt: new Date(Date.now() + 60000),
  });
  console.log("✓ Password reset token created");

  const tokenRec = await findPasswordResetToken(resetTokenHash);
  if (!tokenRec) throw new Error("Could not find created password reset token");
  console.log("✓ Password reset token found");

  const consumed = await consumePasswordResetToken(resetTokenHash, "new_hashed_password");
  if (!consumed) throw new Error("Failed to consume password reset token");
  console.log("✓ Atomic password reset token transaction executed successfully");

  // Test Application CRUD
  const app = await createApplication({
    userId: user.id,
    companyName: "Acme Corp",
    jobTitle: "Senior Engineer",
    source: "LinkedIn",
    status: "Applied",
    appliedDate: new Date(),
    historyData: [
      { previousStatus: null, newStatus: "Applied", changedAt: new Date() },
    ],
  });
  console.log(`✓ Application created with ID: ${app.id}`);

  const appDetail = await getApplicationById(user.id, app.id);
  if (!appDetail || appDetail.companyName !== "Acme Corp") {
    throw new Error("Failed to retrieve created application by ID");
  }
  console.log(`✓ Retrieved application details for: ${appDetail.companyName}`);

  // Test Application Timeline Update Transaction
  await updateApplicationWithTimeline({
    applicationId: app.id,
    existingStatus: "Applied",
    companyName: "Acme Corp",
    jobTitle: "Lead Engineer",
    source: "LinkedIn",
    status: "Interview",
    appliedDate: new Date(),
  });
  console.log("✓ Application updated with timeline transaction");

  // Test Document CRUD
  const doc = await createDocument({
    applicationId: app.id,
    fileName: "resume.pdf",
    originalFileName: "My_Resume.pdf",
    storageKey: `users/user_${user.id}/application_${app.id}/resume.pdf`,
    fileSize: 1024,
    mimeType: "application/pdf",
    tags: "resume,v1",
  });
  console.log(`✓ Document created with ID: ${doc.id}`);

  const docs = await getDocumentsForApplication(user.id, app.id);
  if (docs.length === 0) throw new Error("Expected document for application");
  console.log(`✓ Fetched ${docs.length} document(s) for application`);

  const docList = await listDocumentsForUser(user.id);
  if (docList.length === 0) throw new Error("Expected user documents list");
  console.log("✓ Fetched documents vault list for user");

  // Cleanup Test Data
  await deleteDocument(doc.id);
  console.log("✓ Deleted document");

  await deleteApplication(app.id);
  console.log("✓ Deleted application with cascaded status history");

  // Cleanup User in SQLite
  await prisma.user.delete({ where: { id: user.id } });
  console.log("✓ Cleaned up test user from SQLite");

  console.log("✓ All SQLite provider tests passed successfully!");
}

async function testD1ProviderValidation() {
  console.log("\n==========================================");
  console.log("TEST 2: Testing DATABASE_PROVIDER=d1 Validation & Errors");
  console.log("==========================================");

  process.env.DATABASE_PROVIDER = "d1";
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_DATABASE_ID;
  delete process.env.CLOUDFLARE_API_TOKEN;

  let errorCaught = false;
  try {
    getEnvConfig();
  } catch (err: any) {
    errorCaught = true;
    console.log(`✓ Correctly failed when D1 credentials missing: "${err.message}"`);
  }

  if (!errorCaught) {
    throw new Error("Failed: D1 provider did not fail when configuration was missing!");
  }

  console.log("✓ D1 Provider validation tests passed!");
}

async function runAllTests() {
  try {
    await testSqliteProvider();
    await testD1ProviderValidation();
    console.log("\n==========================================");
    console.log("ALL DATABASE PROVIDER TESTS COMPLETED!");
    console.log("==========================================\n");
    process.exit(0);
  } catch (err) {
    console.error("\nTEST FAILURE:", err);
    process.exit(1);
  }
}

runAllTests();
