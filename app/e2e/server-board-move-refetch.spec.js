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
  for (const [listId, title] of [[from.id, cards.moving], [from.id, cards.stays], [to.id, cards.target]]) {
    const res = await request.post(`${API}/api/cards`, { data: { listId, title } });
    expect(res.ok()).toBeTruthy();
  }
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

// Skipping the refetch is only safe if the on-screen order never drifts from the
// server's, so chain several kinds of moves and compare with the DB after each one.
test("consecutive moves without filters keep the screen in sync with the DB", async ({ page, request }) => {
  const run = Date.now().toString(36);
  const aTitle = `E2E-${run}-A`;
  const bTitle = `E2E-${run}-B`;
  const listA = await (await request.post(`${API}/api/lists`, { data: { title: aTitle } })).json();
  const listB = await (await request.post(`${API}/api/lists`, { data: { title: bTitle } })).json();
  const [a1, a2, a3, b1] = [`E2E-${run} A1`, `E2E-${run} A2`, `E2E-${run} A3`, `E2E-${run} B1`];
  for (const [listId, title] of [[listA.id, a1], [listA.id, a2], [listA.id, a3], [listB.id, b1]]) {
    const res = await request.post(`${API}/api/cards`, { data: { listId, title } });
    expect(res.ok()).toBeTruthy();
  }

  await openUnfilteredScreen(page, aTitle);
  const a = listRegion(page, aTitle);
  const b = listRegion(page, bTitle);
  await expect(cardTitles(a)).toHaveText([a1, a2, a3]);
  const fetches = countCardFetches(page);

  async function move(source, target) {
    const moved = page.waitForResponse((res) => res.url().endsWith("/position") && res.request().method() === "PATCH");
    await dragTo(page, source, target);
    expect((await moved).ok()).toBeTruthy();
    expect(await cardTitles(a).allTextContents()).toEqual(await serverTitles(request, listA.id));
    expect(await cardTitles(b).allTextContents()).toEqual(await serverTitles(request, listB.id));
  }

  // 1. Reorder within the same list: A3 onto A1 (top of the list)
  await move(a.locator(".card", { hasText: a3 }), a.locator(".card", { hasText: a1 }));
  await expect(cardTitles(a).first()).toHaveText(a3);

  // 2. Move the new top card of A into B
  await move(a.locator(".card", { hasText: a3 }), b.locator(".card-list"));
  await expect(cardTitles(a)).toHaveText([a1, a2]);
  await expect(cardTitles(b)).toHaveCount(2);

  // 3. Move B1 back into A
  await move(b.locator(".card", { hasText: b1 }), a.locator(".card-list"));
  await expect(cardTitles(a)).toHaveCount(3);
  await expect(cardTitles(b)).toHaveText([a3]);

  await page.waitForTimeout(500);
  expect(fetches.count).toBe(0);
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
