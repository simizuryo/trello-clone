import { expect, test } from "@playwright/test";
import { addCard, addList, cardTitles, dragTo, listRegion } from "./helpers";

const API = "http://localhost:8080";

// Core flow of "検索(サーバー)": browser → REST API → PostgreSQL.
// The API has no delete endpoint, so test data uses unique names instead of cleanup.
test("create, search, edit and move a card through the real backend", async ({ page, request }) => {
  const run = Date.now().toString(36);
  const fromTitle = `E2E-${run}-from`;
  const toTitle = `E2E-${run}-to`;
  const cardTitle = `E2E-${run} カード`;

  // Every API call from the browser carries a correlation ID that the backend echoes.
  const apiResponses = [];
  page.on("response", (res) => {
    if (res.url().startsWith(`${API}/api/`) && res.request().method() !== "OPTIONS") apiResponses.push(res);
  });

  await page.goto("/");
  await page.getByRole("tab", { name: "検索(サーバー)" }).click();
  await expect(page.getByText("検索中...")).toBeHidden();

  const from = await addList(page, fromTitle);
  const to = await addList(page, toTitle);
  await addCard(from, cardTitle);

  // Search narrows the board down to the new card
  await page.getByLabel("キーワード検索").fill(`E2E-${run}`);
  await expect(page.locator(".card-title")).toHaveText([cardTitle]);

  // Inline edit persists through PATCH /api/cards/:id
  await from.getByText(cardTitle).click();
  await from.getByLabel("優先度").selectOption("HIGH");
  await from.getByLabel("期限").fill("2026-12-24");
  await from.getByRole("button", { name: "保存" }).click();
  const card = from.locator(".card", { hasText: cardTitle });
  await expect(card.locator(".priority-badge")).toHaveText("高");
  await expect(card.locator(".due-date")).toHaveText("12/24");

  // Drag to the other list persists through PATCH /api/cards/:id/position
  const moved = page.waitForResponse((res) => res.url().endsWith("/position") && res.request().method() === "PATCH");
  await dragTo(page, card, to.locator(".card-list"));
  expect((await moved).ok()).toBeTruthy();
  await expect(cardTitles(to)).toHaveText([cardTitle]);
  await expect(cardTitles(from)).toHaveCount(0);

  // Reload: state comes back from the server
  await page.reload();
  await page.getByRole("tab", { name: "検索(サーバー)" }).click();
  await page.getByLabel("キーワード検索").fill(`E2E-${run}`);
  await expect(cardTitles(listRegion(page, toTitle))).toHaveText([cardTitle]);
  await expect(listRegion(page, toTitle).locator(".priority-badge")).toHaveText("高");

  // And directly from the API
  const lists = await (await request.get(`${API}/api/lists`)).json();
  const toList = lists.find((l) => l.title === toTitle);
  const cards = await (await request.get(`${API}/api/cards`, { params: { keyword: cardTitle } })).json();
  expect(cards).toEqual([
    expect.objectContaining({ title: cardTitle, listId: toList.id, sortOrder: 0, priority: "HIGH", dueDate: "2026-12-24" }),
  ]);

  expect(apiResponses.length).toBeGreaterThan(0);
  for (const res of apiResponses) {
    const sent = res.request().headers()["x-request-id"];
    expect(sent).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers()["x-request-id"]).toBe(sent);
  }
});
