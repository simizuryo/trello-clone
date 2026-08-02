import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import {
  deleteCard as dbDeleteCard,
  deleteListWithCards,
  loadBoard,
  putCard,
  putCards,
  putList,
  putLists,
} from "../db/db";

const BoardContext = createContext(null);

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function initialState() {
  return { status: "loading", error: null, lists: [], cards: [] };
}

function reducer(state, action) {
  switch (action.type) {
    case "LOAD_SUCCESS":
      return { status: "ready", error: null, lists: action.lists, cards: action.cards };
    case "LOAD_ERROR":
      return { ...state, status: "error", error: action.error };
    case "SET_LISTS":
      return { ...state, lists: action.lists };
    case "SET_CARDS":
      return { ...state, cards: action.cards };
    case "SAVE_ERROR":
      return { ...state, saveError: action.error };
    default:
      return state;
  }
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function BoardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    let cancelled = false;
    loadBoard()
      .then(({ lists, cards }) => {
        if (cancelled) return;
        const sortedLists = [...lists].sort((a, b) => a.order - b.order);
        dispatch({ type: "LOAD_SUCCESS", lists: sortedLists, cards });
      })
      .catch((err) => {
        if (cancelled) return;
        dispatch({ type: "LOAD_ERROR", error: err.message || "データベースの初期化に失敗しました" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reportSaveError = useCallback((err) => {
    console.error(err);
    dispatch({ type: "SAVE_ERROR", error: "保存に失敗しました。変更が反映されていない可能性があります。" });
  }, []);

  const addList = useCallback(
    (title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const order = state.lists.length;
      const list = { id: makeId("list"), title: trimmed, order };
      const nextLists = [...state.lists, list];
      dispatch({ type: "SET_LISTS", lists: nextLists });
      putList(list).catch(reportSaveError);
    },
    [state.lists, reportSaveError]
  );

  const renameList = useCallback(
    (id, title) => {
      const trimmed = title.trim();
      const existing = state.lists.find((l) => l.id === id);
      if (!existing) return;
      const nextTitle = trimmed || existing.title;
      const nextLists = state.lists.map((l) => (l.id === id ? { ...l, title: nextTitle } : l));
      dispatch({ type: "SET_LISTS", lists: nextLists });
      putList({ ...existing, title: nextTitle }).catch(reportSaveError);
    },
    [state.lists, reportSaveError]
  );

  const removeList = useCallback(
    (id) => {
      const nextLists = state.lists.filter((l) => l.id !== id).map((l, index) => ({ ...l, order: index }));
      const nextCards = state.cards.filter((c) => c.listId !== id);
      dispatch({ type: "SET_LISTS", lists: nextLists });
      dispatch({ type: "SET_CARDS", cards: nextCards });
      deleteListWithCards(id)
        .then(() => putLists(nextLists))
        .catch(reportSaveError);
    },
    [state.lists, state.cards, reportSaveError]
  );

  const addCard = useCallback(
    (listId, title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const order = state.cards.filter((c) => c.listId === listId).length;
      const card = { id: makeId("card"), listId, title: trimmed, order, priority: null, dueDate: null };
      const nextCards = [...state.cards, card];
      dispatch({ type: "SET_CARDS", cards: nextCards });
      putCard(card).catch(reportSaveError);
    },
    [state.cards, reportSaveError]
  );

  const updateCard = useCallback(
    (id, changes) => {
      const existing = state.cards.find((c) => c.id === id);
      if (!existing) return;
      const updated = { ...existing, ...changes };
      const nextCards = state.cards.map((c) => (c.id === id ? updated : c));
      dispatch({ type: "SET_CARDS", cards: nextCards });
      putCard(updated).catch(reportSaveError);
    },
    [state.cards, reportSaveError]
  );

  const removeCard = useCallback(
    (id) => {
      const target = state.cards.find((c) => c.id === id);
      if (!target) return;
      const remaining = state.cards
        .filter((c) => c.id !== id)
        .map((c) => {
          if (c.listId !== target.listId || c.order <= target.order) return c;
          return { ...c, order: c.order - 1 };
        });
      dispatch({ type: "SET_CARDS", cards: remaining });
      dbDeleteCard(id)
        .then(() => putCards(remaining.filter((c) => c.listId === target.listId)))
        .catch(reportSaveError);
    },
    [state.cards, reportSaveError]
  );

  // Used by drag-and-drop: replace the full cards array during a drag (optimistic,
  // no persistence) so the UI can reflect live reordering across lists.
  const setCardsLive = useCallback((cards) => {
    dispatch({ type: "SET_CARDS", cards });
  }, []);

  // Persist final order for the given list ids after a drag ends.
  const commitCardOrder = useCallback(
    (listIds) => {
      const affected = state.cards.filter((c) => listIds.includes(c.listId));
      putCards(affected).catch(reportSaveError);
    },
    [state.cards, reportSaveError]
  );

  const sortList = useCallback(
    (listId, key) => {
      const inList = state.cards.filter((c) => c.listId === listId);
      const others = state.cards.filter((c) => c.listId !== listId);
      const sorted = [...inList].sort((a, b) => {
        if (key === "priority") {
          const ra = a.priority ? PRIORITY_RANK[a.priority] : 3;
          const rb = b.priority ? PRIORITY_RANK[b.priority] : 3;
          return ra - rb;
        }
        // dueDate: ascending, null last
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      const reordered = sorted.map((c, index) => ({ ...c, order: index }));
      const nextCards = [...others, ...reordered];
      dispatch({ type: "SET_CARDS", cards: nextCards });
      putCards(reordered).catch(reportSaveError);
    },
    [state.cards, reportSaveError]
  );

  const value = useMemo(
    () => ({
      ...state,
      addList,
      renameList,
      removeList,
      addCard,
      updateCard,
      removeCard,
      setCardsLive,
      commitCardOrder,
      sortList,
    }),
    [state, addList, renameList, removeList, addCard, updateCard, removeCard, setCardsLive, commitCardOrder, sortList]
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within a BoardProvider");
  return ctx;
}
