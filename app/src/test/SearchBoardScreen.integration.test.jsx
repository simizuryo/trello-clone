import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBoardScreen from "../components/SearchBoardScreen";

// "検索(サーバー)" screen wired to the real API client, with fetch answered by an
// in-memory fake of the Spring Boot API (same routes, validation and ordering).

function createFakeApi() {
  const lists = [
    { id: 1, title: "Todo", sortOrder: 0 },
    { id: 2, title: "Done", sortOrder: 1 },
  ];
  const cards = [
    { id: 10, listId: 1, title: "要件定義をレビューする", sortOrder: 0, priority: "HIGH", dueDate: "2026-08-10" },
    { id: 11, listId: 1, title: "ワイヤーフレームを作成する", sortOrder: 1, priority: "MEDIUM", dueDate: null },
    { id: 12, listId: 2, title: "DB接続確認を行う", sortOrder: 0, priority: null, dueDate: null },
  ];
  let nextId = 100;
  const requests = [];
  const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  const fetch = vi.fn((input, init = {}) => {
    const url = new URL(input, "http://localhost");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, headers: init.headers });

    if (method === "GET" && url.pathname === "/api/lists") return json(lists);
    if (method === "POST" && url.pathname === "/api/lists") {
      const list = { id: nextId++, title: body.title.trim(), sortOrder: lists.length };
      lists.push(list);
      return json(list, 201);
    }
    if (method === "GET" && url.pathname === "/api/cards") {
      const keyword = url.searchParams.get("keyword")?.toLowerCase();
      const priority = url.searchParams.get("priority");
      const listId = url.searchParams.get("listId");
      return json(
        cards
          .filter((c) => !keyword || c.title.toLowerCase().includes(keyword))
          .filter((c) => !priority || c.priority === priority)
          .filter((c) => !listId || c.listId === Number(listId))
          .sort((a, b) => a.listId - b.listId || a.sortOrder - b.sortOrder)
      );
    }
    if (method === "POST" && url.pathname === "/api/cards") {
      if (!body.title?.trim()) return json({}, 400);
      const card = {
        id: nextId++,
        listId: body.listId,
        title: body.title.trim(),
        sortOrder: cards.filter((c) => c.listId === body.listId).length,
        priority: body.priority,
        dueDate: body.dueDate,
      };
      cards.push(card);
      return json(card, 201);
    }
    const patchMatch = url.pathname.match(/^\/api\/cards\/(\d+)$/);
    if (method === "PATCH" && patchMatch) {
      const card = cards.find((c) => c.id === Number(patchMatch[1]));
      Object.assign(card, { title: body.title, priority: body.priority, dueDate: body.dueDate });
      return json(card);
    }
    return json({}, 404);
  });

  return { fetch, requests, cards };
}

let api;

beforeEach(() => {
  api = createFakeApi();
  vi.stubGlobal("fetch", api.fetch);
});

// Cards get role="button" from dnd-kit, so read titles from the DOM directly.
function cardTitles(listName) {
  const list = screen.getByRole("region", { name: `${listName}リスト` });
  return Array.from(list.querySelectorAll(".card-title"), (el) => el.textContent);
}

async function renderScreen() {
  const user = userEvent.setup();
  render(<SearchBoardScreen />);
  await screen.findByText("要件定義をレビューする");
  return user;
}

describe("検索(サーバー) screen", () => {
  it("loads lists and cards from the API and groups cards by list in sortOrder", async () => {
    await renderScreen();

    expect(cardTitles("Todo")).toEqual(["要件定義をレビューする", "ワイヤーフレームを作成する"]);
    expect(cardTitles("Done")).toEqual(["DB接続確認を行う"]);
    expect(within(screen.getByRole("region", { name: "Todoリスト" })).getByText("高")).toHaveClass("priority-high");
    expect(screen.getByText("8/10")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Done" })).toBeInTheDocument();
  });

  it("sends a distinct X-Request-Id with every API call", async () => {
    await renderScreen();
    const ids = api.requests.map((r) => r.headers["X-Request-Id"]);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    ids.forEach((id) => expect(id).toMatch(/^[0-9a-f-]{36}$/));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("searches by keyword (debounced) and by priority", async () => {
    const user = await renderScreen();

    await user.type(screen.getByLabelText("キーワード検索"), "レビュー");
    await waitFor(() => expect(cardTitles("Todo")).toEqual(["要件定義をレビューする"]));
    expect(cardTitles("Done")).toEqual([]);
    const keywordRequests = api.requests.filter((r) => r.path === "/api/cards" && r.query.keyword);
    expect(keywordRequests.at(-1).query.keyword).toBe("レビュー");
    // Debounced: typing 4 characters must not fire 4 searches.
    expect(keywordRequests.length).toBeLessThan(4);

    await user.clear(screen.getByLabelText("キーワード検索"));
    await user.selectOptions(screen.getByLabelText("優先度で絞り込み"), "MEDIUM");
    await waitFor(() => expect(cardTitles("Todo")).toEqual(["ワイヤーフレームを作成する"]));
    expect(api.requests.at(-1).query).toEqual({ priority: "MEDIUM" });
  });

  it("creates a card through the API and shows it at the end of the list", async () => {
    const user = await renderScreen();
    const done = screen.getByRole("region", { name: "Doneリスト" });

    await user.click(within(done).getByRole("button", { name: "+ カードを追加" }));
    await user.keyboard("デプロイする{Enter}");

    await waitFor(() => expect(cardTitles("Done")).toEqual(["DB接続確認を行う", "デプロイする"]));
    expect(api.requests.find((r) => r.method === "POST")).toMatchObject({
      path: "/api/cards",
      body: { listId: 2, title: "デプロイする", priority: null, dueDate: null },
    });
  });

  it("creates a list through the API", async () => {
    const user = await renderScreen();
    await user.click(screen.getByRole("button", { name: "+ リストを追加" }));
    await user.keyboard("Backlog{Enter}");
    expect(await screen.findByRole("region", { name: "Backlogリスト" })).toBeInTheDocument();
  });

  it("edits a card's title, priority and due date through the API", async () => {
    const user = await renderScreen();
    const todo = screen.getByRole("region", { name: "Todoリスト" });

    await user.click(within(todo).getByText("ワイヤーフレームを作成する"));
    const input = within(todo).getByDisplayValue("ワイヤーフレームを作成する");
    await user.clear(input);
    await user.type(input, "ワイヤーフレームを確定する");
    await user.selectOptions(within(todo).getByLabelText("優先度"), "LOW");
    await user.type(within(todo).getByLabelText("期限"), "2026-12-01");
    await user.click(within(todo).getByRole("button", { name: "保存" }));

    await waitFor(() => expect(cardTitles("Todo")).toContain("ワイヤーフレームを確定する"));
    expect(api.requests.find((r) => r.method === "PATCH")).toMatchObject({
      path: "/api/cards/11",
      body: { title: "ワイヤーフレームを確定する", priority: "LOW", dueDate: "2026-12-01" },
    });
    expect(within(todo).getByText("低")).toBeInTheDocument();
    expect(within(todo).getByText("12/1")).toBeInTheDocument();
  });

  it("shows an error message when the API is unavailable", async () => {
    api.fetch.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));
    render(<SearchBoardScreen />);
    expect(await screen.findByText(/検索結果を取得できませんでした/)).toBeInTheDocument();
  });

  it("shows an error message when creating a card fails", async () => {
    const user = await renderScreen();
    api.fetch.mockImplementationOnce(() => Promise.resolve(new Response("{}", { status: 500 })));

    const todo = screen.getByRole("region", { name: "Todoリスト" });
    await user.click(within(todo).getByRole("button", { name: "+ カードを追加" }));
    await user.keyboard("失敗するカード{Enter}");

    expect(await screen.findByText("API request failed: 500 /api/cards")).toBeInTheDocument();
    expect(cardTitles("Todo")).not.toContain("失敗するカード");
  });
});
