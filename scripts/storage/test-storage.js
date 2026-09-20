import { LocalStorageProvider, CloudStorageProvider, getStorageKey } from "../../src/infrastructure/storage/index";

async function testStorage() {
  console.log("=== Running Storage Provider Verification Tests ===\n");

  // 1. Key generation test
  const testKey = getStorageKey("testuser123", "app456", "my_resume.pdf");
  console.log(`[Test 1] Generated Storage Key: '${testKey}'`);
  if (testKey !== "users/user_testuser123/application_app456/my_resume.pdf") {
    throw new Error("Key generation format mismatch");
  }
  console.log("-> Key generation test PASSED\n");

  // 2. LocalStorageProvider operations test
  const localProvider = new LocalStorageProvider();
  const testBuffer = Buffer.from("Hello CareerFlow Storage Provider Test!");
  const testFileKey = "users/user_testuser123/application_app456/test_document.txt";

  console.log(`[Test 2] Uploading test file to LocalStorageProvider...`);
  await localProvider.upload(testFileKey, testBuffer);

  const fileExists = await localProvider.exists(testFileKey);
  console.log(`[Test 2] File exists check: ${fileExists}`);
  if (!fileExists) throw new Error("File should exist after upload");

  const downloaded = await localProvider.download(testFileKey);
  const downloadedText = downloaded.stream.toString("utf-8");
  console.log(`[Test 2] Downloaded content: '${downloadedText}'`);
  if (downloadedText !== "Hello CareerFlow Storage Provider Test!") {
    throw new Error("Downloaded content mismatch");
  }

  console.log(`[Test 2] Deleting test file...`);
  await localProvider.delete(testFileKey);
  const existsAfterDelete = await localProvider.exists(testFileKey);
  console.log(`[Test 2] File exists after delete: ${existsAfterDelete}`);
  if (existsAfterDelete) throw new Error("File should not exist after deletion");

  console.log("-> LocalStorageProvider operations test PASSED\n");

  // 3. Path Traversal Security Test
  console.log("[Test 3] Testing Path Traversal Security Rejection...");
  const maliciousKeys = [
    "../secret.txt",
    "users/../../etc/passwd",
    "..\\windows\\system32",
    "/absolute/path/doc.pdf"
  ];

  for (const badKey of maliciousKeys) {
    try {
      await localProvider.upload(badKey, Buffer.from("malicious content"));
      throw new Error(`Security Failure: Key '${badKey}' was not rejected by LocalStorageProvider`);
    } catch (err) {
      console.log(`[Test 3] Correctly rejected malicious key '${badKey}': "${err.message}"`);
    }
  }
  console.log("-> Path Traversal Security test PASSED\n");

  // 4. CloudStorageProvider configuration error test
  console.log("[Test 4] Testing CloudStorageProvider configuration error validation...");
  try {
    new CloudStorageProvider({ endpoint: "", bucket: "" });
    throw new Error("CloudStorageProvider should have failed on missing env variables");
  } catch (err) {
    console.log(`[Test 4] Caught expected configuration error: "${err.message}"`);
  }
  console.log("-> CloudStorageProvider validation test PASSED\n");

  // 5. Optional Real Cloudflare R2 Integration Test
  if (process.env.R2_INTEGRATION_TEST === "true") {
    console.log("[Test 5] Running Real Cloudflare R2 Integration Test (R2_INTEGRATION_TEST=true)...");
    const cloudProvider = new CloudStorageProvider();
    const timestamp = Date.now();
    const r2TestKey = `users/test_integration/r2_test_${timestamp}.txt`;
    const r2TestContent = `Cloudflare R2 Integration Test Payload - ${timestamp}`;

    console.log(`[Test 5] Uploading to R2: key='${r2TestKey}'`);
    await cloudProvider.upload(r2TestKey, Buffer.from(r2TestContent), "text/plain");

    const r2Exists = await cloudProvider.exists(r2TestKey);
    console.log(`[Test 5] R2 Exists check: ${r2Exists}`);
    if (!r2Exists) throw new Error("R2 object should exist after upload");

    const r2Downloaded = await cloudProvider.download(r2TestKey);
    const r2Text = r2Downloaded.stream.toString("utf-8");
    console.log(`[Test 5] R2 Downloaded content: '${r2Text}'`);
    if (r2Text !== r2TestContent) throw new Error("R2 Downloaded content mismatch");

    console.log(`[Test 5] Deleting test object from R2...`);
    await cloudProvider.delete(r2TestKey);

    const r2ExistsAfterDelete = await cloudProvider.exists(r2TestKey);
    console.log(`[Test 5] R2 Exists check after delete: ${r2ExistsAfterDelete}`);
    if (r2ExistsAfterDelete) throw new Error("R2 object should not exist after deletion");

    console.log("-> Real Cloudflare R2 Integration Test PASSED\n");
  } else {
    console.log("[Test 5] Real Cloudflare R2 Integration Test skipped (Set R2_INTEGRATION_TEST=true with credentials to run).\n");
  }

  console.log("=== All Storage Provider Tests PASSED Successfully ===");
}

testStorage().catch((err) => {
  console.error("Storage test failed:", err);
  process.exit(1);
});
