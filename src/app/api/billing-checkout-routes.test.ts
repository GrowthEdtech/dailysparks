import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { POST as login } from "./login/route";
import { POST as createCheckout } from "./billing/checkout/route";
import { POST as finalizeCheckout } from "./billing/finalize/route";
import { SESSION_COOKIE_NAME } from "../../lib/session";
import { PRICING_MARKET_COOKIE_NAME } from "../../lib/pricing-market";

const {
  verifyIdTokenMock,
  createSessionCookieMock,
  verifySessionCookieMock,
  createCheckoutSessionForParentMock,
  finalizeCheckoutSessionForParentMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  createSessionCookieMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
  createCheckoutSessionForParentMock: vi.fn(),
  finalizeCheckoutSessionForParentMock: vi.fn(),
}));

vi.mock("../../lib/firebase-admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
    verifySessionCookie: verifySessionCookieMock,
  }),
}));

vi.mock("../../lib/stripe", () => ({
  createCheckoutSessionForParent: createCheckoutSessionForParentMock,
  finalizeCheckoutSessionForParent: finalizeCheckoutSessionForParentMock,
  isStripeConfigured: () => true,
}));

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-checkout-"));
  process.env.DAILY_SPARKS_STORE_PATH = path.join(tempDirectory, "mvp-store.json");
  verifyIdTokenMock.mockReset();
  createSessionCookieMock.mockReset();
  verifySessionCookieMock.mockReset();
  createCheckoutSessionForParentMock.mockReset();
  finalizeCheckoutSessionForParentMock.mockReset();
});

afterEach(async () => {
  delete process.env.DAILY_SPARKS_STORE_PATH;

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("billing checkout route", () => {
  test("rejects unauthenticated checkout creation", async () => {
    const response = await createCheckout(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subscriptionPlan: "monthly",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toMatch(/log in/i);
  });

  test("rejects invalid checkout plans", async () => {
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
    });

    const response = await createCheckout(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=firebase-session-cookie`,
        },
        body: JSON.stringify({
          subscriptionPlan: "lifetime",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/monthly|yearly|plan/i);
  });

  test("creates a Stripe checkout session URL for an authenticated parent", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
    });
    createCheckoutSessionForParentMock.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });

    await login(
      new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          idToken: "firebase-id-token",
        }),
      }),
    );

    const response = await createCheckout(
      new Request("https://dailysparks.geledtech.com/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=firebase-session-cookie`,
        },
        body: JSON.stringify({
          subscriptionPlan: "monthly",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/c/pay/cs_test_123");
    expect(createCheckoutSessionForParentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "https://dailysparks.geledtech.com",
        pricingMarket: "intl",
        subscriptionPlan: "monthly",
      }),
    );
  });

  test("uses forwarded production headers when building the Stripe return origin", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
    });
    createCheckoutSessionForParentMock.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_456",
    });

    await login(
      new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          idToken: "firebase-id-token",
        }),
      }),
    );

    const response = await createCheckout(
      new Request("http://0.0.0.0:8080/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=firebase-session-cookie`,
          "x-client-country": "HK",
          "x-forwarded-host": "dailysparks.geledtech.com",
          "x-forwarded-proto": "https",
        },
        body: JSON.stringify({
          subscriptionPlan: "yearly",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/c/pay/cs_test_456");
    expect(createCheckoutSessionForParentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "https://dailysparks.geledtech.com",
        pricingMarket: "hk",
        subscriptionPlan: "yearly",
      }),
    );
  });

  test("uses the market override cookie before the geolocation header", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
      auth_time: Math.floor(Date.now() / 1000),
    });
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
    });
    createCheckoutSessionForParentMock.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_789",
    });

    await login(
      new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          idToken: "firebase-id-token",
        }),
      }),
    );

    const response = await createCheckout(
      new Request("http://0.0.0.0:8080/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=firebase-session-cookie; ${PRICING_MARKET_COOKIE_NAME}=intl`,
          "x-forwarded-host": "dailysparks.geledtech.com",
          "x-forwarded-proto": "https",
          "x-client-country": "HK",
        },
        body: JSON.stringify({
          subscriptionPlan: "monthly",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.com/c/pay/cs_test_789");
    expect(createCheckoutSessionForParentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "https://dailysparks.geledtech.com",
        pricingMarket: "intl",
        subscriptionPlan: "monthly",
      }),
    );
  });

  test("finalizes a completed Stripe checkout session for the logged-in parent", async () => {
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-parent-1",
      email: "parent@example.com",
      name: "Parent Example",
    });
    finalizeCheckoutSessionForParentMock.mockResolvedValue({
      parent: {
        id: "parent-1",
        email: "parent@example.com",
        fullName: "Parent Example",
        subscriptionStatus: "active",
        subscriptionPlan: "monthly",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        createdAt: "2026-03-31T00:00:00.000Z",
        updatedAt: "2026-03-31T00:00:00.000Z",
      },
      student: {
        id: "student-1",
        parentId: "parent-1",
        studentName: "Student",
        programme: "PYP",
        programmeYear: 5,
        goodnotesEmail: "",
        notionConnected: false,
        createdAt: "2026-03-31T00:00:00.000Z",
        updatedAt: "2026-03-31T00:00:00.000Z",
      },
    });

    const response = await finalizeCheckout(
      new Request("https://dailysparks.geledtech.com/api/billing/finalize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=firebase-session-cookie`,
        },
        body: JSON.stringify({
          sessionId: "cs_test_123",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.parent.subscriptionStatus).toBe("active");
    expect(body.parent.stripeSubscriptionId).toBe("sub_123");
    expect(finalizeCheckoutSessionForParentMock).toHaveBeenCalledWith({
      sessionId: "cs_test_123",
      expectedEmail: "parent@example.com",
    });
  });
});
