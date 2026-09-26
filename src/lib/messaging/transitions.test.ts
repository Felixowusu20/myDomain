import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canTransition, publicStatus, retryDelayMs } from "@/lib/messaging/status";

describe("message status", () => {
  it("allows the delivery path and blocks terminal changes", () => {
    assert.equal(canTransition("QUEUED", "PROCESSING"), true);
    assert.equal(canTransition("PROCESSING", "SENT"), true);
    assert.equal(canTransition("SENT", "DELIVERED"), true);
    assert.equal(canTransition("DELIVERED", "FAILED"), false);
    assert.equal(canTransition("FAILED", "QUEUED"), false);
    assert.equal(publicStatus("QUEUED"), "queued");
  });

  it("backs off and stops growing", () => {
    assert.equal(retryDelayMs(1), 15_000);
    assert.equal(retryDelayMs(2), 30_000);
    assert.equal(retryDelayMs(20), 600_000);
  });
});
