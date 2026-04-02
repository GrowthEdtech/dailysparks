import { describe, expect, test, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import EditorialAdminPage from "./page";

describe("EditorialAdminPage", () => {
  test("redirects the index route to the sources tab", async () => {
    await expect(EditorialAdminPage()).rejects.toThrow(
      "REDIRECT:/admin/editorial/sources",
    );
  });
});
