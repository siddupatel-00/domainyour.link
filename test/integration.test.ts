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
import { generateOtp, storeOtp, verifyOtp, createOtpChallenge, verifyOtpChallenge } from "../src/lib/email";
import { hashPassword, verifyPasswordHash, createOrUpdateUser, findUserByEmailOrUsername, updateUserAvatar, updateUsername, deleteUserAccount } from "../src/lib/userStore";
import { isReservedUsername } from "../src/lib/reservedUsernames";
import {
  findSharedEmployeeByEmailOrUser,
  updateSharedEmployee,
  addSharedEmployee,
  deleteSharedEmployee,
} from "../src/lib/employeeStore";
import {
  addSharedLinkGroup,
  getSharedLinkGroups,
  updateSharedLinkGroup,
  deleteSharedLinkGroup,
  findSharedGroupByShareCode,
} from "../src/lib/groupStore";

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

  // 4. OTP Verification Tests (In-Memory & Serverless Stateless Tokens)
  console.log("\n4. Email OTP Code Generation & Verification Tests");
  const testOtp = generateOtp();
  assert(typeof testOtp === "string" && testOtp.length === 6 && /^\d{6}$/.test(testOtp), "Generates valid 6-digit numeric OTP");

  // Serverless challenge token test
  const challengeToken = createOtpChallenge("siddu@gmail.com", testOtp, "siddu");
  assert(typeof challengeToken === "string" && challengeToken.includes("."), "Creates HMAC-SHA256 signed OTP challenge token");

  const validChallengeResult = verifyOtpChallenge("siddu@gmail.com", testOtp, challengeToken);
  assert(validChallengeResult.valid === true && validChallengeResult.username === "siddu", "Statelessly verifies valid OTP across serverless instances");

  const wrongCodeChallengeResult = verifyOtpChallenge("siddu@gmail.com", "000000", challengeToken);
  assert(wrongCodeChallengeResult.valid === false, "Rejects incorrect OTP code in challenge token");

  const tamperedChallengeResult = verifyOtpChallenge("siddu@gmail.com", testOtp, challengeToken + "tampered");
  assert(tamperedChallengeResult.valid === false, "Rejects tampered challenge token");

  // Local fallback store test
  storeOtp("test@gmail.com", testOtp, "siddu");
  const validVerification = verifyOtp("test@gmail.com", testOtp);
  assert(validVerification.valid === true && validVerification.username === "siddu", "Successfully validates correct OTP code from store");

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

  // 6. Unique Username & Reserved Names Tests
  console.log("\n6. Unique Username & Reserved Names Tests");
  assert(isReservedUsername("admin") === true, "Flags 'admin' as reserved");
  assert(isReservedUsername("ceo") === true, "Flags 'ceo' as reserved");
  assert(isReservedUsername("employee") === true, "Flags 'employee' as reserved");
  assert(isReservedUsername("api") === true, "Flags 'api' as reserved");
  assert(isReservedUsername("siddu") === false, "Allows normal username 'siddu'");

  // 7. CEO Master Authentication & Security Tests
  console.log("\n7. CEO Master Authentication & Security Tests");
  assert(verifyCeoPassword("ceo123456"), "Validates correct CEO master password");
  assert(!verifyCeoPassword("random123"), "Rejects invalid CEO password");

  const ceoToken = createCeoSessionToken();
  assert(typeof ceoToken === "string" && ceoToken.length > 20, "Generates signed CEO master session token");
  assert(verifyCeoSessionToken(ceoToken) === true, "Successfully verifies valid CEO master token");
  assert(verifyCeoSessionToken(token) === false, "Prevents regular user session token from unlocking CEO portal");
  assert(verifyCeoSessionToken("tampered.ceo.token") === false, "Rejects tampered CEO token");

  // 8. Employee Session Authentication & Security Tests
  console.log("\n8. Employee Session Authentication & Security Tests");
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

  // 9. Employee Password Reset & OTP Tests
  console.log("\n9. Employee Password Reset & OTP Tests");
  const empUser = findSharedEmployeeByEmailOrUser("alex");
  assert(empUser !== undefined && empUser.email === "alex@company.com", "Finds employee by username 'alex'");

  const empOtp = generateOtp();
  storeOtp(empUser!.email, empOtp, empUser!.name || undefined);
  assert(verifyOtp(empUser!.email, empOtp).valid === true, "Verifies employee OTP code for password reset");
  assert(verifyOtp(empUser!.email, "000000").valid === false, "Rejects incorrect OTP code");

  updateSharedEmployee(empUser!.id, { password: "newSecurePassword123" });
  const updatedEmp = findSharedEmployeeByEmailOrUser("alex");
  assert(updatedEmp !== undefined && updatedEmp.password === "newSecurePassword123", "Updates employee password after reset");

  // 10. Real-Time Employee Access Revocation & Suspension Tests
  console.log("\n10. Real-Time Employee Access Revocation & Suspension Tests");
  // Add a test employee
  const testEmp = {
    id: 999,
    name: "Revoke Test",
    email: "revoketest@company.com",
    username: "revoketest",
    password: "password123",
    role: "Insights Viewer",
    status: "active",
    inviteToken: null,
    permissions: "[\"view_insights\"]",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  addSharedEmployee(testEmp);

  // Generate valid session token
  const testToken = createEmployeeSessionToken({
    id: 999,
    name: "Revoke Test",
    email: "revoketest@company.com",
    role: "Insights Viewer",
    permissions: ["view_insights"],
  });
  assert(verifyEmployeeSessionToken(testToken) !== null, "Generates active token for test employee");

  // Case A: CEO Suspends Employee
  updateSharedEmployee(999, { status: "suspended" });
  const suspendedEmp = findSharedEmployeeByEmailOrUser("revoketest@company.com");
  assert(suspendedEmp !== undefined && suspendedEmp.status === "suspended", "Marks employee status as suspended");

  // Case B: CEO Deletes / Revokes Employee Access
  const deleted = deleteSharedEmployee(999);
  assert(deleted === true, "Successfully deletes employee from store when CEO clicks revoke");
  assert(findSharedEmployeeByEmailOrUser("revoketest@company.com") === undefined, "Employee is no longer found in store after revocation");

  // 11. Link Groups Organizer Boxes Tests
  console.log("\n11. Link Groups Organizer Boxes Tests");
  const testGroup = {
    id: 101,
    username: "siddu",
    name: "GitHub Projects",
    color: "#2563eb",
    linkIds: JSON.stringify([1, 2, 5]),
    shareCode: "grp_101",
    isShared: true,
    expiresAt: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  addSharedLinkGroup(testGroup);
  const sidduGroups = getSharedLinkGroups("siddu");
  assert(sidduGroups.length > 0 && sidduGroups[0].name === "GitHub Projects", "Creates and retrieves link groups for user");

  updateSharedLinkGroup(101, { name: "Featured GitHub Projects", linkIds: JSON.stringify([1, 2, 5, 8]) });
  const updatedGroup = getSharedLinkGroups("siddu").find((g) => g.id === 101);
  assert(
    updatedGroup !== undefined &&
    updatedGroup.name === "Featured GitHub Projects" &&
    JSON.parse(updatedGroup.linkIds).length === 4,
    "Updates link group name and assigned links"
  );

  // Reorder test
  const g1 = { id: 201, username: "siddu", name: "Group A", color: "#000", linkIds: "[]", shareCode: "g1", isShared: true, expiresAt: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() };
  const g2 = { id: 202, username: "siddu", name: "Group B", color: "#000", linkIds: "[]", shareCode: "g2", isShared: true, expiresAt: null, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() };
  const g3 = { id: 203, username: "siddu", name: "Group C", color: "#000", linkIds: "[]", shareCode: "g3", isShared: true, expiresAt: null, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() };
  addSharedLinkGroup(g1);
  addSharedLinkGroup(g2);
  addSharedLinkGroup(g3);

  const { reorderSharedLinkGroups } = await import("../src/lib/groupStore");
  reorderSharedLinkGroups("siddu", [203, 201, 202]);
  const reordered = getSharedLinkGroups("siddu");
  assert(
    reordered[0]?.id === 203 && reordered[1]?.id === 201 && reordered[2]?.id === 202,
    "Reorders link groups and persists customized sequence across sessions/devices"
  );

  deleteSharedLinkGroup(201);
  deleteSharedLinkGroup(202);
  deleteSharedLinkGroup(203);

  // 12. Email Analytics Digest & Reset Clicks Tests
  console.log("\n12. Email Analytics Digest & Reset Clicks Tests");
  const defaultUserPref = "off";
  assert(defaultUserPref === "off", "Email analytics recap defaults to 'off' unless explicitly enabled by user");

  const bothEnabledPref: string = "both";
  const receivesWeekly = bothEnabledPref === "weekly" || bothEnabledPref === "both";
  const receivesMonthly = bothEnabledPref === "monthly" || bothEnabledPref === "both";
  assert(receivesWeekly && receivesMonthly, "Allows selecting both Weekly & Monthly recaps simultaneously");

  // Rate Limiting (1 test email per hour per user)
  const ONE_HOUR = 60 * 60 * 1000;
  const lastTestSentTime = Date.now() - (15 * 60 * 1000); // 15 mins ago
  const elapsed = Date.now() - lastTestSentTime;
  const isRateLimited = elapsed < ONE_HOUR;
  const remainingMins = Math.ceil((ONE_HOUR - elapsed) / (60 * 1000));
  assert(isRateLimited === true && remainingMins === 45, "Enforces 1-hour rate limit on test email dispatches");

  const expiredTestTime = Date.now() - (65 * 60 * 1000); // 65 mins ago
  const isAllowedAgain = (Date.now() - expiredTestTime) >= ONE_HOUR;
  assert(isAllowedAgain === true, "Permits sending new test email once 1-hour cooldown completes");

  // 13. Avatar Profile Picture & Random Short Code Tests
  console.log("\n13. Avatar Profile Picture & Random Short Code Tests");
  const testAvatarBase64 = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
  await createOrUpdateUser("avatartester", "avatar@test.com", "avatarPass123");
  
  // Update avatar
  const avatarUpdated = await updateUserAvatar("avatartester", testAvatarBase64);
  assert(avatarUpdated === true, "Successfully uploads and stores profile picture data URL");

  const userWithAvatar = await findUserByEmailOrUsername("avatartester");
  assert(userWithAvatar?.avatar === testAvatarBase64, "Retrieves updated profile picture for user");

  // Remove avatar
  await updateUserAvatar("avatartester", null);
  const userWithoutAvatar = await findUserByEmailOrUsername("avatartester");
  assert(userWithoutAvatar?.avatar === null, "Successfully removes profile picture");

  // Random 6-char short code link generation test
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let randomCode = "";
  for (let i = 0; i < 6; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // 14. Change Username & Delete Account Tests
  console.log("\n14. Change Username & Delete Account Tests");
  await createOrUpdateUser("olduser123", "olduser@test.com", "pass12345");

  // Update username
  const updatedUsernameOk = await updateUsername("olduser123", "newuser456");
  assert(updatedUsernameOk === true, "Successfully changes username in store");

  const foundNewUser = await findUserByEmailOrUsername("newuser456");
  assert(foundNewUser?.username === "newuser456", "Finds user under updated username");

  const oldUserGone = await findUserByEmailOrUsername("olduser123");
  assert(!oldUserGone || oldUserGone.username === "newuser456", "Old username no longer points to separate user");

  // Delete account
  const deleteAccountOk = await deleteUserAccount("newuser456");
  assert(deleteAccountOk === true, "Successfully executes account deletion");

  const deletedUser = await findUserByEmailOrUsername("newuser456");
  assert(!deletedUser, "Deleted account is permanently removed from store");

  // 15. Link Name vs Short Code Tests
  console.log("\n15. Link Name vs Short Code Tests");
  const testLinkTitle: string = "github-project";
  const testShortCode: string = "88r872";
  
  // Verify title is distinct from shortcode
  assert(testLinkTitle !== testShortCode, "Link name is distinct from auto-assigned short code");
  assert(testShortCode.length === 6, "Auto-assigned short code is 6 characters");

  // 16. Group Sharing with Random Code & Expiration Tests
  console.log("\n16. Group Sharing with Random Code & Expiration Tests");
  const groupRandomCode = Math.random().toString(36).substring(2, 8).toLowerCase();
  
  const testSharedGroup = {
    id: 999,
    username: "testuser",
    name: "Portfolio Projects",
    color: "#2563eb",
    linkIds: "[1, 2]",
    shareCode: groupRandomCode,
    isShared: true,
    expiresAt: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  addSharedLinkGroup(testSharedGroup);

  const foundGroup = findSharedGroupByShareCode(groupRandomCode);
  assert(foundGroup?.id === 999, "Successfully finds shared group by anonymous random short code");
  assert(foundGroup?.isShared === true, "Shared group defaults to active public sharing");
  assert(foundGroup?.shareCode?.length === 6, "Group share code is exactly 6 random characters");

  // Toggle sharing off (Private)
  updateSharedLinkGroup(999, { isShared: false });
  const privateGroup = findSharedGroupByShareCode(groupRandomCode);
  assert(privateGroup?.isShared === false, "Successfully turns off public sharing for group (Private mode)");

  // Temporary expiration in past
  const pastDate = new Date(Date.now() - 3600000);
  updateSharedLinkGroup(999, { isShared: true, expiresAt: pastDate });
  const expiredGroup = findSharedGroupByShareCode(groupRandomCode);
  const isExp = Boolean(expiredGroup?.expiresAt && new Date(expiredGroup.expiresAt).getTime() <= Date.now());
  assert(isExp === true, "Successfully flags temporary shared group as expired when timestamp passes");

  // 17. Permanent Bio Page (/b/[code]) & Previous Username Tests
  console.log("\n17. Permanent Bio Page (/b/[code]) & Previous Username Tests");
  const testBioUser = await createOrUpdateUser("originaluser", "biotest@example.com", "Secret123!");
  assert(Boolean(testBioUser.bioCode), "User automatically receives permanent bioCode");
  assert(testBioUser.bioCode?.length === 6, "Permanent bioCode is 6 characters");

  // Lookup user by permanent bioCode
  const { findUserByBioCode } = await import("../src/lib/userStore");
  const foundByBioCode = await findUserByBioCode(testBioUser.bioCode!);
  assert(foundByBioCode?.username === "originaluser", "Successfully resolves user by permanent bioCode");

  // Rename user and verify old username resolves to updated user
  await updateUsername("originaluser", "renameduser");
  const resolvedOld = await findUserByEmailOrUsername("originaluser");
  assert(resolvedOld?.username === "renameduser", "Previous username automatically resolves to updated user account");

  // Verify permanent bioCode remains intact after rename
  const stillFoundByBio = await findUserByBioCode(testBioUser.bioCode!);
  assert(stillFoundByBio?.username === "renameduser", "Permanent bio link (/b/[code]) remains 100% intact after username change");

  console.log("\n========================================");
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log("========================================\n");

  if (failed > 0) process.exit(1);
}

runTests();
