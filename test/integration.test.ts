import { sanitizeSlug, isValidUrl } from "../src/lib/utils";
import {
  createSessionToken,
  verifySessionToken,
  verifyCeoPassword,
  createCeoSessionToken,
  verifyCeoSessionToken,
  createEmployeeSessionToken,
  verifyEmployeeSessionToken,
} from "../src/lib/auth";
import { generateOtp, storeOtp, verifyOtp } from "../src/lib/email";
import { hashPassword, verifyPasswordHash, createOrUpdateUser, findUserByEmailOrUsername } from "../src/lib/userStore";

async function runTests() {
  console.log("🧪 Running domainyourlink Unit & Integration Tests...\n");

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

  // 3. Creator Session Token Tests
  console.log("\n3. Creator Session & JWT Token Verification Tests");
  const token = createSessionToken({ username: "siddu", email: "siddu@gmail.com" });
  assert(typeof token === "string" && token.length > 20, "Creates signed JWT session token");

  const session = verifySessionToken(token);
  assert(session !== null && session.username === "siddu", "Verifies valid JWT session token with username");

  const invalidSession = verifySessionToken("tampered.token.here");
  assert(invalidSession === null, "Rejects tampered JWT token");

  // 4. OTP Verification Tests
  console.log("\n4. Email OTP Code Generation & Verification Tests");
  const testOtp = generateOtp();
  assert(typeof testOtp === "string" && testOtp.length === 6 && /^\d{6}$/.test(testOtp), "Generates valid 6-digit numeric OTP");

  storeOtp("test@gmail.com", testOtp, "siddu");
  const validVerification = verifyOtp("test@gmail.com", testOtp);
  assert(validVerification.valid === true && validVerification.username === "siddu", "Successfully validates correct OTP code");

  const replayVerification = verifyOtp("test@gmail.com", testOtp);
  assert(replayVerification.valid === false, "Prevents OTP replay attacks (one-time use)");

  storeOtp("wrong@gmail.com", "999999");
  const wrongVerification = verifyOtp("wrong@gmail.com", "000000");
  assert(wrongVerification.valid === false, "Rejects incorrect OTP code");

  // 5. User Account Password Hashing & Verification Tests
  console.log("\n5. User Account Password Hashing & Verification Tests");
  const hashed = hashPassword("SuperSecret2026!");
  assert(typeof hashed === "string" && hashed.length === 64, "Hashes user password using SHA-256");
  assert(verifyPasswordHash("SuperSecret2026!", hashed), "Verifies correct hashed password");
  assert(!verifyPasswordHash("WrongPassword!", hashed), "Rejects incorrect password");

  const createdUser = await createOrUpdateUser("alex", "alex@example.com", "AlexPass123!");
  assert(createdUser.username === "alex" && createdUser.email === "alex@example.com", "Creates new user in user store");

  const foundUser = await findUserByEmailOrUsername("alex@example.com");
  assert(foundUser !== null && foundUser.username === "alex", "Finds user by email");
  assert(verifyPasswordHash("AlexPass123!", foundUser?.password), "Validates stored user password");

  // 6. CEO Master Authentication & Security Tests
  console.log("\n6. CEO Master Authentication & Security Tests");
  assert(verifyCeoPassword("ceo123456"), "Validates correct CEO master password");
  assert(!verifyCeoPassword("random123"), "Rejects invalid CEO password");

  const ceoToken = createCeoSessionToken();
  assert(typeof ceoToken === "string" && ceoToken.length > 20, "Generates signed CEO master session token");
  assert(verifyCeoSessionToken(ceoToken) === true, "Successfully verifies valid CEO master token");
  assert(verifyCeoSessionToken(token) === false, "Prevents regular user session token from unlocking CEO portal");
  assert(verifyCeoSessionToken("tampered.ceo.token") === false, "Rejects tampered CEO token");

  // 7. Employee Session Authentication & Security Tests
  console.log("\n7. Employee Session Authentication & Security Tests");
  const empToken = createEmployeeSessionToken({
    id: 1,
    name: "Alex Vance",
    email: "alex@company.com",
    role: "Insights Viewer",
    permissions: ["view_insights"],
  });
  assert(typeof empToken === "string" && empToken.length > 20, "Generates signed employee session token");

  const empSession = verifyEmployeeSessionToken(empToken);
  assert(
    empSession !== null &&
    empSession.email === "alex@company.com" &&
    empSession.role === "Insights Viewer",
    "Successfully verifies employee session with assigned permissions"
  );
  assert(verifyEmployeeSessionToken(token) === null, "Rejects regular user session token for employee portal");
  assert(verifyEmployeeSessionToken(ceoToken) === null, "Rejects CEO master token for employee portal");
  assert(verifyEmployeeSessionToken("tampered.token") === null, "Rejects tampered employee token");

  console.log("\n========================================");
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log("========================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
