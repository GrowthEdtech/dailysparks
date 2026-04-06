import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("/llms-full.txt route", () => {
  test("returns expanded AI-readable site documentation", async () => {
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("Core pages");
    expect(body).toContain("https://dailysparks.geledtech.com/");
  });
});
