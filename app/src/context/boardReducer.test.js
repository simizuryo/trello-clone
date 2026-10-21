import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./boardReducer";

describe("boardReducer", () => {
  it("starts in the loading state", () => {
    expect(initialState()).toEqual({ status: "loading", error: null, lists: [], cards: [] });
  });

  it("LOAD_SUCCESS sets data and ready status", () => {
    const lists = [{ id: "l1" }];
    const cards = [{ id: "c1" }];
    expect(reducer(initialState(), { type: "LOAD_SUCCESS", lists, cards })).toEqual({
      status: "ready",
      error: null,
      lists,
      cards,
    });
  });

  it("LOAD_ERROR records the error", () => {
    const next = reducer(initialState(), { type: "LOAD_ERROR", error: "boom" });
    expect(next.status).toBe("error");
    expect(next.error).toBe("boom");
  });

  it("SET_LISTS / SET_CARDS replace only their slice", () => {
    const state = { ...initialState(), status: "ready", cards: [{ id: "c" }] };
    const withLists = reducer(state, { type: "SET_LISTS", lists: [{ id: "l" }] });
    expect(withLists.lists).toEqual([{ id: "l" }]);
    expect(withLists.cards).toBe(state.cards);

    const withCards = reducer(state, { type: "SET_CARDS", cards: [] });
    expect(withCards.cards).toEqual([]);
    expect(withCards.status).toBe("ready");
  });

  it("SAVE_ERROR sets saveError", () => {
    expect(reducer(initialState(), { type: "SAVE_ERROR", error: "x" }).saveError).toBe("x");
  });

  it("returns the same state for unknown actions", () => {
    const state = initialState();
    expect(reducer(state, { type: "UNKNOWN" })).toBe(state);
  });
});
