import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { developmentMockOutcome, mockSmsNetworkConnector } from "@/lib/messaging/connectors/mock";

describe("mock sms connector", () => {
  it("is marked development-only and simulates delivery", async () => {
    assert.equal(mockSmsNetworkConnector.developmentOnly, true);
    assert.equal(mockSmsNetworkConnector.id, "mock");
    const sent = await mockSmsNetworkConnector.send({
      messageId: "msg_1",
      to: "+233241234567",
      body: "Your verification code is 123456",
      senderId: "MyDomain",
      metadata: {},
    });
    assert.equal(sent.status, "SENT");
    assert.equal(sent.providerMessageId, "mock_msg_1");
    assert.equal("body" in sent, false);
    const receipt = await mockSmsNetworkConnector.getDeliveryStatus(sent.providerMessageId!);
    assert.equal(receipt.status, "DELIVERED");
    assert.equal(receipt.simulated, true);
  });

  it("can simulate a retryable failure outside production", async () => {
    assert.equal(developmentMockOutcome({ mockOutcome: "temporary" }, "production"), undefined);
    assert.equal(developmentMockOutcome({ mockOutcome: "temporary" }, "test"), "temporary");
    if (process.env.NODE_ENV === "production") return;
    const result = await mockSmsNetworkConnector.send({
      messageId: "msg_2",
      to: "+233241234567",
      body: "hello",
      senderId: "MyDomain",
      metadata: { mockOutcome: "temporary" },
    });
    assert.equal(result.retryable, true);
    assert.equal(result.errorCode, "MOCK_TEMPORARY");
  });
});
