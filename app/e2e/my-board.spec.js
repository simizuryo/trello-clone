import { expect, test } from "@playwright/test";
import { addCard, addList, cardTitles, dragTo, listRegion } from "./helpers";

// Core flow of "マイボード" (browser IndexedDB). Each test gets a fresh browser
// context, so IndexedDB starts empty.
test("create lists and cards, edit, drag between lists, and persist across reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "マイボード" })).toHaveAttribute("aria-selected", "true");

  const todo = await addList(page, "Todo");
  const done = await addList(page, "Done");
  await addCard(todo, "企画書を書く");
  await addCard(todo, "レビューを依頼する");
  await expect(cardTitles(todo)).toHaveText(["企画書を書く", "レビューを依頼する"]);

  // Inline edit: priority + due date
  await todo.getByText("企画書を書く").click();
  await todo.getByLabel("優先度").selectOption("high");
  await todo.getByLabel("期限").fill("2026-11-03");
  await todo.getByRole("button", { name: "保存" }).click();
  const card = todo.locator(".card", { hasText: "企画書を書く" });
  await expect(card.locator(".priority-badge")).toHaveText("高");
  await expect(card.locator(".due-date")).toHaveText("11/3");

  // Drag the card into the (empty) Done list
  await dragTo(page, card, done.locator(".card-list"));
  await expect(cardTitles(done)).toHaveText(["企画書を書く"]);
  await expect(cardTitles(todo)).toHaveText(["レビューを依頼する"]);

  // Everything survives a reload (persisted in IndexedDB)
  await page.reload();
  await expect(cardTitles(listRegion(page, "Done"))).toHaveText(["企画書を書く"]);
  await expect(cardTitles(listRegion(page, "Todo"))).toHaveText(["レビューを依頼する"]);
  await expect(listRegion(page, "Done").locator(".priority-badge")).toHaveText("高");
});
