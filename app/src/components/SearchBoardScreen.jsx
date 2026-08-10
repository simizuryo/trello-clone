import { useEffect, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { createCard, createList, fetchLists, moveCard, searchCards, updateCardDetails } from "../api/client";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import SearchList from "./SearchList";
import AddListForm from "./AddListForm";

function groupCardsByListId(cards) {
  const map = new Map();
  for (const card of cards) {
    if (!map.has(card.listId)) map.set(card.listId, []);
    map.get(card.listId).push(card);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
  return map;
}

// Moves `activeId` into `targetListId` at `targetIndex`, reindexing the
// affected list(s) so `sortOrder` stays a dense 0..n-1 sequence per list.
// Mirrors the algorithm the backend uses in CardService#moveCard so the
// optimistic UI state matches what the server will persist.
function moveCardInCards(cards, activeId, targetListId, targetIndex) {
  const active = cards.find((c) => c.id === activeId);
  if (!active) return cards;
  const sourceListId = active.listId;

  const byList = groupCardsByListId(cards);
  const sourceArr = (byList.get(sourceListId) || []).filter((c) => c.id !== activeId);

  let targetArr;
  if (sourceListId === targetListId) {
    targetArr = sourceArr;
  } else {
    targetArr = (byList.get(targetListId) || []).slice();
  }

  const clampedIndex = Math.max(0, Math.min(targetIndex, targetArr.length));
  targetArr.splice(clampedIndex, 0, { ...active, listId: targetListId });

  const untouched = cards.filter((c) => c.listId !== sourceListId && c.listId !== targetListId);
  const reindexedSource = sourceListId === targetListId ? [] : sourceArr.map((c, i) => ({ ...c, sortOrder: i }));
  const reindexedTarget = targetArr.map((c, i) => ({ ...c, sortOrder: i }));

  return [...untouched, ...reindexedSource, ...reindexedTarget];
}

export default function SearchBoardScreen() {
  const [keyword, setKeyword] = useState("");
  const [priority, setPriority] = useState("");
  const [listId, setListId] = useState("");
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activeCard, setActiveCard] = useState(null);

  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    fetchLists()
      .then(setLists)
      .catch((err) => {
        setStatus("error");
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    searchCards({ listId: listId || undefined, priority: priority || undefined, keyword: debouncedKeyword || undefined })
      .then((result) => {
        if (cancelled) return;
        setCards(result);
        setStatus("ready");
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword, priority, listId]);

  async function refetchCards() {
    try {
      const result = await searchCards({
        listId: listId || undefined,
        priority: priority || undefined,
        keyword: debouncedKeyword || undefined,
      });
      setCards(result);
    } catch (err) {
      setActionError(err.message || "最新のカード情報の取得に失敗しました");
    }
  }

  async function handleAddCard(listId, title) {
    setActionError(null);
    try {
      const card = await createCard({ listId, title });
      setCards((prev) => [...prev, card]);
    } catch (err) {
      setActionError(err.message || "カードの追加に失敗しました");
    }
  }

  async function handleAddList(title) {
    setActionError(null);
    try {
      const list = await createList({ title });
      setLists((prev) => [...prev, list]);
    } catch (err) {
      setActionError(err.message || "リストの追加に失敗しました");
    }
  }

  async function handleUpdateCard(id, changes) {
    setActionError(null);
    try {
      const updated = await updateCardDetails(id, changes);
      setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setActionError(err.message || "カードの更新に失敗しました");
      refetchCards();
    }
  }

  function resolveTargetListId(overId) {
    if (lists.some((l) => l.id === overId)) return overId;
    const overCard = cards.find((c) => c.id === overId);
    return overCard ? overCard.listId : null;
  }

  function handleDragStart(event) {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card || null);
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over) return;
    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    const targetListId = resolveTargetListId(over.id);
    if (!targetListId) return;

    const cardsByList = groupCardsByListId(cards);
    const overCard = cards.find((c) => c.id === over.id);
    const targetArr = cardsByList.get(targetListId) || [];
    const targetIndex = overCard ? targetArr.findIndex((c) => c.id === over.id) : targetArr.length;

    if (activeCardData.listId === targetListId) {
      const currentIndex = targetArr.findIndex((c) => c.id === active.id);
      if (currentIndex === targetIndex || currentIndex === -1) return;
    }

    setCards((prev) => moveCardInCards(prev, active.id, targetListId, targetIndex));
  }

  async function handleDragEnd() {
    const cardId = activeCard ? activeCard.id : null;
    setActiveCard(null);
    if (!cardId) return;

    const finalCard = cards.find((c) => c.id === cardId);
    if (!finalCard) return;

    setActionError(null);
    try {
      await moveCard(cardId, { listId: finalCard.listId, sortOrder: finalCard.sortOrder });
    } catch (err) {
      setActionError(err.message || "並び替えに失敗しました");
    } finally {
      refetchCards();
    }
  }

  function handleDragCancel() {
    setActiveCard(null);
  }

  const cardsByListId = groupCardsByListId(cards);

  return (
    <>
      <div className="search-bar">
        <input
          type="search"
          className="search-input"
          placeholder="タイトルで検索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="キーワード検索"
        />
        <select
          className="search-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="優先度で絞り込み"
        >
          <option value="">優先度: すべて</option>
          <option value="HIGH">高</option>
          <option value="MEDIUM">中</option>
          <option value="LOW">低</option>
        </select>
        <select
          className="search-select"
          value={listId}
          onChange={(e) => setListId(e.target.value)}
          aria-label="リストで絞り込み"
        >
          <option value="">リスト: すべて</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.title}
            </option>
          ))}
        </select>
      </div>

      {status === "loading" && <p className="search-status">検索中...</p>}
      {status === "error" && <p className="error-message">検索結果を取得できませんでした: {error}</p>}
      {actionError && <p className="error-message">{actionError}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <main className="board" aria-label="検索結果ボード">
          {lists.map((list) => (
            <SearchList
              key={list.id}
              list={list}
              cards={cardsByListId.get(list.id) ?? []}
              onAddCard={handleAddCard}
              onUpdateCard={handleUpdateCard}
            />
          ))}
          <AddListForm onSubmit={handleAddList} />
        </main>

        <DragOverlay>
          {activeCard ? (
            <article className="card card-overlay">
              <div className="card-body">
                <span className="card-title">{activeCard.title}</span>
              </div>
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
