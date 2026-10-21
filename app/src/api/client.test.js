import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCard, createList, fetchLists, moveCard, searchCards, updateCardDetails } from "./client";

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(jsonResponse({})));
  vi.stubGlobal("fetch", fetchMock);
});

function lastCall() {
  const [url, init = {}] = fetchMock.mock.calls.at(-1);
  return { url, init, body: init.body ? JSON.parse(init.body) : undefined };
}

describe("api client", () => {
  it("fetchLists GETs /api/lists and returns the parsed body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1, title: "Todo", sortOrder: 0 }]));
    await expect(fetchLists()).resolves.toEqual([{ id: 1, title: "Todo", sortOrder: 0 }]);
    expect(lastCall().url).toMatch(/\/api\/lists$/);
    expect(lastCall().init.method ?? "GET").toBe("GET");
  });

  it("searchCards only sends the filters that are set", async () => {
    await searchCards();
    expect(lastCall().url).toMatch(/\/api\/cards$/);

    await searchCards({ listId: 2, priority: "HIGH", keyword: "レビュー" });
    const url = new URL(lastCall().url, "http://x");
    expect(url.pathname).toBe("/api/cards");
    expect(Object.fromEntries(url.searchParams)).toEqual({ listId: "2", priority: "HIGH", keyword: "レビュー" });
  });

  it("createList POSTs the title as JSON", async () => {
    await createList({ title: "Backlog" });
    const { url, init, body } = lastCall();
    expect(url).toMatch(/\/api\/lists$/);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(body).toEqual({ title: "Backlog" });
  });

  it("createCard normalizes empty priority/dueDate to null", async () => {
    await createCard({ listId: 1, title: "t", priority: "", dueDate: "" });
    expect(lastCall().body).toEqual({ listId: 1, title: "t", priority: null, dueDate: null });
  });

  it("updateCardDetails PATCHes /api/cards/:id", async () => {
    await updateCardDetails(5, { title: "t", priority: "LOW", dueDate: "2026-09-01" });
    const { url, init, body } = lastCall();
    expect(url).toMatch(/\/api\/cards\/5$/);
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ title: "t", priority: "LOW", dueDate: "2026-09-01" });
  });

  it("moveCard PATCHes /api/cards/:id/position", async () => {
    await moveCard(7, { listId: 3, sortOrder: 0 });
    const { url, init, body } = lastCall();
    expect(url).toMatch(/\/api\/cards\/7\/position$/);
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ listId: 3, sortOrder: 0 });
  });

  it.each([
    ["GET", () => fetchLists()],
    ["POST", () => createList({ title: "x" })],
    ["PATCH", () => moveCard(1, { listId: 1, sortOrder: 0 })],
  ])("rejects with status and path on a non-2xx %s response", async (_method, call) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
    await expect(call()).rejects.toThrow(/API request failed: 500 \/api\//);
  });
});
