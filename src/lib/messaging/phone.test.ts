import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { callingCountry, maskPhone, normalizePhone } from "@/lib/messaging/phone";
import { MessagingError } from "@/lib/messaging/errors";

describe("phone normalization", () => {
  it("accepts E.164 and strips spacing", () => {
    assert.equal(normalizePhone("+233 24 123 4567"), "+233241234567");
    assert.equal(normalizePhone("00233241234567"), "+233241234567");
  });

  it("rejects local numbers without a country code", () => {
    assert.throws(() => normalizePhone("0241234567"), MessagingError);
    assert.throws(() => normalizePhone("not-a-phone"), MessagingError);
  });

  it("masks destinations and guesses a calling country", () => {
    assert.equal(maskPhone("+233241234567"), "+233******67");
    assert.equal(callingCountry("+233241234567"), "GH");
    assert.equal(callingCountry("+12025550123"), "NANP");
    assert.equal(callingCountry("+33123456789"), "UN");
  });
});
