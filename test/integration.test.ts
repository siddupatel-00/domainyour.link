import { sanitizeSlug, isValidUrl } from "../src/lib/utils";
import { createSessionToken, verifySessionToken, checkAdminPassword } from "../src/lib/auth";

async function runTests() {
  console.log("🧪 Running PermanentLink Unit & Integration Tests...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Slug sanitization tests
  console.log("1. Slug Sanitization & Normalization Tests");
  assert(sanitizeSlug("Siddu") === "siddu", "Lowercases usernames");
  assert(sanitizeSlug("LinkedIn Profile!") === "linkedin-profile", "Sanitizes spaces and special chars");
  assert(sanitizeSlug("  github_repo  ") === "github_repo", "Preserves underscores and trims spaces");
  assert(sanitizeSlug("---lifeagent---") === "lifeagent", "Removes leading and trailing hyphens");

  // 2. URL validation tests
  console.log("\n2. URL Validation Tests");
  assert(isValidUrl("https://linkedin.com/in/siddu"), "Validates standard https URL");
  assert(isValidUrl("http://localhost:3000"), "Validates localhost http URL");
  assert(!isValidUrl("not-a-url"), "Rejects invalid string");
  assert(!isValidUrl("javascript:alert(1)"), "Rejects javascript: scheme");

  // 3. Admin Authentication tests
  console.log("\n3. Admin Auth & JWT Token Verification Tests");
  process.env.ADMIN_PASSWORD = "test-secret-password-123";
  process.env.ADMIN_JWT_SECRET = "01234567890123456789012345678901";

  assert(checkAdminPassword("test-secret-password-123"), "Validates correct admin password");
  assert(!checkAdminPassword("wrong-password"), "Rejects incorrect password");

  const token = await createSessionToken();
  assert(typeof token === "string" && token.length > 20, "Creates signed JWT session token");

  const isValid = await verifySessionToken(token);
  assert(isValid === true, "Verifies valid JWT session token");

  const isInvalid = await verifySessionToken("tampered.token.here");
  assert(isInvalid === false, "Rejects tampered JWT token");

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
