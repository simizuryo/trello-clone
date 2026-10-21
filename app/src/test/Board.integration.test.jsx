import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openDB } from "idb";
import App from "../App";

// "マイボード" end to end inside jsdom: UI → BoardContext → idb → (fake) IndexedDB.

async function clearDatabase() {
  const db = await openDB("trello-clone-db", 1, {
    upgrade(d) {
      d.createObjectStore("lists", { keyPath: "id" });
      d.createObjectStore("cards", { keyPath: "id" }).createIndex("by-listId", "listId");
    },
  });
  await db.clear("lists");
  await db.clear("cards");
  db.close();
}

// Cards get role="button" from dnd-kit, so read titles from the DOM directly.
function cardTitles(list) {
  return Array.from(list.querySelectorAll(".card-title"), (el) => el.textContent);
}

async function renderApp() {
  const user = userEvent.setup();
  const view = render(<App />);
  await screen.findByRole("button", { name: "+ リストを追加" });
  return { user, ...view };
}

async function addList(user, title) {
  await user.click(screen.getByRole("button", { name: "+ リストを追加" }));
  await user.keyboard(`${title}{Enter}{Escape}`);
  return screen.findByRole("region", { name: `${title}リスト` });
}

async function addCard(user, list, title) {
  await user.click(within(list).getByRole("button", { name: "+ カードを追加" }));
  await user.keyboard(`${title}{Enter}{Escape}`);
  return within(list).findByText(title);
}

describe("マイボード (IndexedDB)", () => {
  beforeEach(clearDatabase);

  it("starts empty", async () => {
    await renderApp();
    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });

  it("creates lists and cards, edits a card, and persists everything across reloads", async () => {
    const { user, unmount } = await renderApp();

    const todo = await addList(user, "Todo");
    await addList(user, "Done");
    await addCard(user, todo, "牛乳を買う");
    await addCard(user, todo, "レポートを書く");
    expect(within(todo).getByText("2")).toBeInTheDocument();

    await user.click(within(todo).getByText("牛乳を買う"));
    const titleInput = within(todo).getByDisplayValue("牛乳を買う");
    await user.clear(titleInput);
    await user.type(titleInput, "牛乳とパンを買う");
    await user.selectOptions(within(todo).getByLabelText("優先度"), "high");
    await user.type(within(todo).getByLabelText("期限"), "2026-11-03");
    await user.click(within(todo).getByRole("button", { name: "保存" }));

    expect(within(todo).getByText("牛乳とパンを買う")).toBeInTheDocument();
    expect(within(todo).getByText("高")).toHaveClass("priority-badge", "priority-high");
    expect(within(todo).getByText("11/3")).toBeInTheDocument();

    // Simulate a page reload: a fresh tree must load the same board from IndexedDB.
    unmount();
    await renderApp();
    const reloadedTodo = screen.getByRole("region", { name: "Todoリスト" });
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual([
      "Todoリスト",
      "Doneリスト",
    ]);
    expect(cardTitles(reloadedTodo)).toEqual(["牛乳とパンを買う", "レポートを書く"]);
    expect(within(reloadedTodo).getByText("高")).toBeInTheDocument();
  });

  it("sorts a list by priority and keeps the new order after reload", async () => {
    const { user, unmount } = await renderApp();
    const list = await addList(user, "Backlog");
    for (const title of ["A", "B", "C"]) await addCard(user, list, title);

    async function setPriority(title, label) {
      await user.click(within(list).getByText(title));
      await user.selectOptions(within(list).getByLabelText("優先度"), label);
      await user.click(within(list).getByRole("button", { name: "保存" }));
    }
    await setPriority("A", "low");
    await setPriority("C", "high");

    await user.click(within(list).getByRole("button", { name: "優先順" }));
    const order = () => cardTitles(screen.getByRole("region", { name: "Backlogリスト" }));
    expect(order()).toEqual(["C", "A", "B"]);

    unmount();
    await renderApp();
    expect(order()).toEqual(["C", "A", "B"]);
  });

  it("deletes a card and a list (after confirmation) and the deletion persists", async () => {
    const { user, unmount } = await renderApp();
    const list = await addList(user, "Temp");
    await addCard(user, list, "消すカード");
    await addCard(user, list, "残すカード");

    await user.click(within(list).getAllByRole("button", { name: "カードを削除" })[0]);
    expect(within(list).queryByText("消すカード")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tempリストを削除" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    expect(screen.getByRole("region", { name: "Tempリスト" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tempリストを削除" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "削除する" }));
    expect(screen.queryByRole("region", { name: "Tempリスト" })).not.toBeInTheDocument();

    unmount();
    await renderApp();
    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });
});
