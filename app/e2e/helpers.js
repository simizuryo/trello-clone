import { expect } from "@playwright/test";

export function listRegion(page, title) {
  return page.getByRole("region", { name: `${title}リスト` });
}

export function cardTitles(list) {
  return list.locator(".card-title");
}

export async function addList(page, title) {
  await page.getByRole("button", { name: "+ リストを追加" }).click();
  await page.getByPlaceholder("リスト名を入力").fill(title);
  await page.getByPlaceholder("リスト名を入力").press("Enter");
  await page.getByPlaceholder("リスト名を入力").press("Escape");
  await expect(listRegion(page, title)).toBeVisible();
  return listRegion(page, title);
}

export async function addCard(list, title) {
  await list.getByRole("button", { name: "+ カードを追加" }).click();
  await list.getByPlaceholder("カードのタイトルを入力").fill(title);
  await list.getByPlaceholder("カードのタイトルを入力").press("Enter");
  await list.getByPlaceholder("カードのタイトルを入力").press("Escape");
  await expect(cardTitles(list).filter({ hasText: title })).toBeVisible();
}

// dnd-kit's PointerSensor needs a real pointer gesture: press, move past the 4px
// activation distance, then travel to the target in small steps before releasing.
export async function dragTo(page, source, target) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 2, { steps: 2 });
  await page.mouse.up();
}
