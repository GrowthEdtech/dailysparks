import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("/llms.txt route", () => {
  test("returns text guidance for AI crawlers", async () => {
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("Daily Sparks");
    expect(body).toContain("Growth Education Limited");
  });
});
