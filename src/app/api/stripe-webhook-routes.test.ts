import { describe, expect, test, vi } from "vitest";

const {
  constructStripeWebhookEventMock,
  handleStripeWebhookEventMock,
} = vi.hoisted(() => ({
  constructStripeWebhookEventMock: vi.fn(),
  handleStripeWebhookEventMock: vi.fn(),
}));

vi.mock("../../lib/stripe", () => ({
  constructStripeWebhookEvent: constructStripeWebhookEventMock,
  handleStripeWebhookEvent: handleStripeWebhookEventMock,
  isStripeWebhookConfigured: () => true,
}));

import { POST as handleWebhook } from "./stripe/webhook/route";

describe("stripe webhook route", () => {
  test("rejects webhook calls without a Stripe signature", async () => {
    const response = await handleWebhook(
      new Request("https://dailysparks.geledtech.com/api/stripe/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ type: "invoice.paid" }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/signature/i);
  });

  test("returns 400 when Stripe signature verification fails", async () => {
    constructStripeWebhookEventMock.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await handleWebhook(
      new Request("https://dailysparks.geledtech.com/api/stripe/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": "t=1,v1=bad",
        },
        body: JSON.stringify({ type: "invoice.paid" }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/verify|signature/i);
  });

  test("accepts a verified Stripe event and dispatches it", async () => {
    constructStripeWebhookEventMock.mockReturnValue({
      id: "evt_123",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_123",
        },
      },
    });

    const response = await handleWebhook(
      new Request("https://dailysparks.geledtech.com/api/stripe/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": "t=1,v1=good",
        },
        body: JSON.stringify({ type: "invoice.paid" }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(handleStripeWebhookEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "evt_123",
        type: "invoice.paid",
      }),
    );
  });
});
