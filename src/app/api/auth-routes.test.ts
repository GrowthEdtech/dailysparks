import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { GET as getProfile, PUT as updateProfile } from "./profile/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { SESSION_COOKIE_NAME } from "../../lib/session";

let tempDirectory = "";

beforeEach(async () => {
  tempDirectory = await mkdtemp(path.join(tmpdir(), "daily-sparks-routes-"));
  process.env.DAILY_SPARKS_STORE_PATH = path.join(tempDirectory, "mvp-store.json");
});

afterEach(async () => {
  delete process.env.DAILY_SPARKS_STORE_PATH;

  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("auth routes", () => {
  test("rejects login when the email is invalid", async () => {
    const request = new Request("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "not-an-email",
        studentName: "Katherine",
      }),
    });

    const response = await login(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/valid email/i);
  });

  test("creates a session cookie on successful login", async () => {
    const request = new Request("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "parent@example.com",
        fullName: "Parent Example",
        studentName: "Katherine",
      }),
    });

    const response = await login(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.parent.email).toBe("parent@example.com");
    expect(body.student.programme).toBe("PYP");
    expect(body.student.programmeYear).toBe(5);
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_COOKIE_NAME}=${encodeURIComponent("parent@example.com")}`,
    );
  });

  test("returns the active profile for a valid session cookie", async () => {
    await login(
      new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "parent@example.com",
          fullName: "Parent Example",
          studentName: "Katherine",
        }),
      }),
    );

    const response = await getProfile(
      new Request("http://localhost:3000/api/profile", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=parent@example.com`,
        },
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.student.studentName).toBe("Katherine");
  });

  test("rejects invalid profile updates", async () => {
    const response = await updateProfile(
      new Request("http://localhost:3000/api/profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=parent@example.com`,
        },
        body: JSON.stringify({
          goodnotesEmail: "bad-email",
          programme: "DP",
          programmeYear: 4,
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/programme|year|email/i);
  });

  test("updates the student programme and year", async () => {
    await login(
      new Request("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "parent@example.com",
          fullName: "Parent Example",
          studentName: "Katherine",
        }),
      }),
    );

    const response = await updateProfile(
      new Request("http://localhost:3000/api/profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie: `${SESSION_COOKIE_NAME}=parent@example.com`,
        },
        body: JSON.stringify({
          goodnotesEmail: "katherine@goodnotes.email",
          programme: "DP",
          programmeYear: 2,
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.student.programme).toBe("DP");
    expect(body.student.programmeYear).toBe(2);
  });

  test("clears the session cookie on logout", async () => {
    const response = await logout(
      new Request("http://localhost:3000/api/logout", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_COOKIE_NAME}=;`,
    );
  });
});
