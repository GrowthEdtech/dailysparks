import { describe, expect, test } from "vitest";

import {
  DEFAULT_FIREBASE_AUTH_DOMAIN,
  DEFAULT_FIREBASE_HELPER_ORIGIN,
  getFirebaseAuthProxyRewrites,
  getFirebaseWebConfig,
} from "./firebase-web-config";

describe("firebase web config", () => {
  test("defaults to the Daily Sparks auth domain", () => {
    const config = getFirebaseWebConfig();

    expect(DEFAULT_FIREBASE_AUTH_DOMAIN).toBe("dailysparks.geledtech.com");
    expect(config.authDomain).toBe("dailysparks.geledtech.com");
  });

  test("defaults the helper origin to the Firebase project domain", () => {
    expect(DEFAULT_FIREBASE_HELPER_ORIGIN).toBe(
      "https://gen-lang-client-0586185740.firebaseapp.com",
    );
  });

  test("creates rewrites for Firebase auth and init helper routes", () => {
    expect(getFirebaseAuthProxyRewrites()).toEqual([
      {
        source: "/__/auth/:path*",
        destination:
          "https://gen-lang-client-0586185740.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/:path*",
        destination:
          "https://gen-lang-client-0586185740.firebaseapp.com/__/firebase/:path*",
      },
    ]);
  });
});
