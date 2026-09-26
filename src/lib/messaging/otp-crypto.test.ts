import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateOtpCode, hashOtp, otpMatches } from "@/lib/messaging/otp-crypto";

const secret = "test-auth-secret-must-be-32-characters-min";

describe("otp crypto", () => {
  it("generates a numeric code and stores only a hash", () => {
    process.env.AUTH_SECRET = secret;
    const code = generateOtpCode(6);
    assert.match(code, /^\d{6}$/);
    const hash = hashOtp("project", "+233241234567", "login", code);
    assert.notEqual(hash, code);
    assert.equal(otpMatches("project", "+233241234567", "login", code, hash), true);
    assert.equal(otpMatches("project", "+233241234567", "login", "000000", hash), false);
    assert.equal(otpMatches("other", "+233241234567", "login", code, hash), false);
  });

  it("uses a configurable length", () => {
    const code = generateOtpCode(4);
    assert.match(code, /^\d{4}$/);
  });
});
