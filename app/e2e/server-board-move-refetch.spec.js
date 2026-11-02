import { expect, test } from "@playwright/test";
import { cardTitles, dragTo, listRegion } from "./helpers";

const API = "http://localhost:8080";

// #29: without filters, a successful move keeps the on-screen state (it mirrors the
// server's reindexing) and skips refetching every card. A failed move refetches so
// the screen falls back to the server's state.

async function setupBoard(request) {
  const run = Date.now().toString(36);
  const fromTitle = `E2E-${run}-from`;
  const toTitle = `E2E-${run}-to`;
  const from = await (await request.post(`${API}/api/lists`, { data: { title: fromTitle } })).json();
  const to = await (await request.post(`${API}/api/lists`, { data: { title: toTitle } })).json();
  const cards = { moving: `E2E-${run} 移動`, stays: `E2E-${run} 残る`, target: `E2E-${run} 移動先` };
  await request.post(`${API}/api/cards`, { data: { listId: from.id, title: cards.moving } });
  await request.post(`${API}/api/cards`, { data: { listId: from.id, title: cards.stays } });
  await request.post(`${API}/api/cards`, { data: { listId: to.id, title: cards.target } });
  return { fromTitle, toTitle, toId: to.id, fromId: from.id, cards };
}

async function openUnfilteredScreen(page, fromTitle) {
  await page.goto("/");
  await page.getByRole("tab", { name: "検索(サーバー)" }).click();
  await expect(page.getByText("検索中...")).toBeHidden();
  // Lists from earlier runs come first; bring this run's lists into the viewport.
  await listRegion(page, fromTitle).evaluate((el) => el.scrollIntoView({ inline: "start" }));
}

function countCardFetches(page) {
  const counter = { count: 0 };
  page.on("request", (req) => {
    if (req.method() === "GET" && new URL(req.url()).pathname === "/api/cards") counter.count++;
  });
  return counter;
}

async function serverTitles(request, listId) {
  const cards = await (await request.get(`${API}/api/cards`, { params: { listId } })).json();
  return cards.sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.title);
}

test("a successful move without filters does not refetch the cards", async ({ page, request }) => {
  const { fromTitle, toTitle, fromId, toId, cards } = await setupBoard(request);
  await openUnfilteredScreen(page, fromTitle);
  const from = listRegion(page, fromTitle);
  const to = listRegion(page, toTitle);

  const fetches = countCardFetches(page);
  const moved = page.waitForResponse((res) => res.url().endsWith("/position") && res.request().method() === "PATCH");
  await dragTo(page, from.locator(".card", { hasText: cards.moving }), to.locator(".card-list"));
  expect((await moved).ok()).toBeTruthy();

  await expect(cardTitles(from)).toHaveText([cards.stays]);
  await expect(cardTitles(to)).toContainText([cards.moving]);
  // Give a would-be refetch time to go out before asserting it never did.
  await page.waitForTimeout(500);
  expect(fetches.count).toBe(0);

  // The order kept on screen is exactly what the server persisted.
  expect(await cardTitles(to).allTextContents()).toEqual(await serverTitles(request, toId));
  expect(await cardTitles(from).allTextContents()).toEqual(await serverTitles(request, fromId));
});

test("a failed move refetches and restores the server's state", async ({ page, request }) => {
  const { fromTitle, toTitle, cards } = await setupBoard(request);
  await openUnfilteredScreen(page, fromTitle);
  const from = listRegion(page, fromTitle);
  const to = listRegion(page, toTitle);

  await page.route("**/api/cards/*/position", (route) => route.fulfill({ status: 500, body: "{}" }));
  const fetches = countCardFetches(page);
  const refetched = page.waitForResponse(
    (res) => res.request().method() === "GET" && new URL(res.url()).pathname === "/api/cards"
  );
  await dragTo(page, from.locator(".card", { hasText: cards.moving }), to.locator(".card-list"));
  await refetched;

  await expect(page.getByText(/API request failed: 500/)).toBeVisible();
  await expect(cardTitles(from)).toHaveText([cards.moving, cards.stays]);
  await expect(cardTitles(to)).toHaveText([cards.target]);
  expect(fetches.count).toBe(1);
});
