import { expect, test } from "@playwright/test";
import { cardTitles, dragTo, listRegion } from "./helpers";

const API = "http://localhost:8080";

// Regression for #20: once there are more lists than cards, the dragged card's ID
// also exists as a list ID. Lists used the raw ID as their droppable ID, so dnd-kit
// mixed the two up, dragOver bounced the card between lists until React threw
// "Maximum update depth exceeded" and the whole app unmounted.
test("drag a card across lists on a board with many lists", async ({ page, request }) => {
  const run = Date.now().toString(36);
  const listTitles = Array.from({ length: 20 }, (_, i) => `E2E-${run}-L${i}`);
  const cardTitle = `E2E-${run} カード`;

  const lists = [];
  for (const title of listTitles) {
    lists.push(await (await request.post(`${API}/api/lists`, { data: { title } })).json());
  }
  await request.post(`${API}/api/cards`, { data: { listId: lists[0].id, title: cardTitle } });

  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/");
  await page.getByRole("tab", { name: "検索(サーバー)" }).click();
  await page.getByLabel("キーワード検索").fill(`E2E-${run}`);
  await expect(page.locator(".card-title")).toHaveText([cardTitle]);
  await expect(page.getByText("検索中...")).toBeHidden();

  const from = listRegion(page, listTitles[0]);
  const to = listRegion(page, listTitles[3]);
  // Lists from earlier runs come first; bring this run's lists into the viewport.
  await from.evaluate((el) => el.scrollIntoView({ inline: "start" }));
  const moved = page.waitForResponse((res) => res.url().endsWith("/position") && res.request().method() === "PATCH");
  await dragTo(page, from.locator(".card", { hasText: cardTitle }), to.locator(".card-list"));
  expect((await moved).ok()).toBeTruthy();

  await expect(cardTitles(to)).toHaveText([cardTitle]);
  await expect(cardTitles(from)).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
