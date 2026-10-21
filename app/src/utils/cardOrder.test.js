import { describe, expect, it } from "vitest";
import { groupCardsByList, moveCardInCards, sortListCards } from "./cardOrder";

const card = (id, listId, sortOrder, extra = {}) => ({ id, listId, title: id, sortOrder, ...extra });

function positionsInList(cards, listId) {
  return (groupCardsByList(cards, "sortOrder").get(listId) || []).map((c) => [c.id, c.sortOrder]);
}

describe("groupCardsByList", () => {
  it("groups by listId and sorts each group by the given key", () => {
    const cards = [card("a2", 1, 2), card("b0", 2, 0), card("a0", 1, 0), card("a1", 1, 1)];
    const map = groupCardsByList(cards, "sortOrder");
    expect(map.get(1).map((c) => c.id)).toEqual(["a0", "a1", "a2"]);
    expect(map.get(2).map((c) => c.id)).toEqual(["b0"]);
  });

  it("supports the IndexedDB board's `order` key", () => {
    const cards = [
      { id: "x", listId: "l", order: 1 },
      { id: "y", listId: "l", order: 0 },
    ];
    expect(groupCardsByList(cards, "order").get("l").map((c) => c.id)).toEqual(["y", "x"]);
  });
});

describe("moveCardInCards", () => {
  const base = [card("a0", 1, 0), card("a1", 1, 1), card("a2", 1, 2), card("b0", 2, 0), card("c0", 3, 0)];

  it("reorders within the same list and keeps a dense sequence", () => {
    const next = moveCardInCards(base, "a2", 1, 0, "sortOrder");
    expect(positionsInList(next, 1)).toEqual([
      ["a2", 0],
      ["a0", 1],
      ["a1", 2],
    ]);
  });

  it("moves across lists and reindexes both source and target", () => {
    const next = moveCardInCards(base, "a1", 2, 1, "sortOrder");
    expect(positionsInList(next, 1)).toEqual([
      ["a0", 0],
      ["a2", 1],
    ]);
    expect(positionsInList(next, 2)).toEqual([
      ["b0", 0],
      ["a1", 1],
    ]);
    expect(next.find((c) => c.id === "a1").listId).toBe(2);
  });

  it("clamps out-of-range indexes", () => {
    expect(positionsInList(moveCardInCards(base, "a0", 2, 99, "sortOrder"), 2)).toEqual([
      ["b0", 0],
      ["a0", 1],
    ]);
    expect(positionsInList(moveCardInCards(base, "a2", 1, -5, "sortOrder"), 1)[0]).toEqual(["a2", 0]);
  });

  it("moves into an empty list", () => {
    const next = moveCardInCards(base, "a0", 9, 0, "sortOrder");
    expect(positionsInList(next, 9)).toEqual([["a0", 0]]);
  });

  it("leaves cards of unrelated lists untouched", () => {
    const next = moveCardInCards(base, "a1", 2, 0, "sortOrder");
    expect(next.find((c) => c.id === "c0")).toBe(base[4]);
  });

  it("returns the input unchanged when the active card is unknown", () => {
    expect(moveCardInCards(base, "nope", 1, 0, "sortOrder")).toBe(base);
  });

  it("does not mutate the input", () => {
    const snapshot = JSON.stringify(base);
    moveCardInCards(base, "a1", 2, 0, "sortOrder");
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});

describe("sortListCards", () => {
  const cards = [
    { id: "none", order: 0, priority: null, dueDate: null },
    { id: "low", order: 1, priority: "low", dueDate: "2026-09-01" },
    { id: "high", order: 2, priority: "high", dueDate: null },
    { id: "medium", order: 3, priority: "medium", dueDate: "2026-08-01" },
  ];

  it("sorts by priority high→medium→low with no priority last", () => {
    const result = sortListCards(cards, "priority");
    expect(result.map((c) => c.id)).toEqual(["high", "medium", "low", "none"]);
    expect(result.map((c) => c.order)).toEqual([0, 1, 2, 3]);
  });

  it("sorts by dueDate ascending with no dueDate last, keeping ties stable", () => {
    const result = sortListCards(cards, "dueDate");
    expect(result.map((c) => c.id)).toEqual(["medium", "low", "none", "high"]);
    expect(result.map((c) => c.order)).toEqual([0, 1, 2, 3]);
  });

  it("does not mutate the input", () => {
    const snapshot = JSON.stringify(cards);
    sortListCards(cards, "priority");
    expect(JSON.stringify(cards)).toBe(snapshot);
  });
});
