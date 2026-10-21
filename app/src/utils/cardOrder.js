// Shared card ordering logic for both boards. `orderKey` is the per-list
// position field: "order" for the IndexedDB board, "sortOrder" for the server board.

export function groupCardsByList(cards, orderKey) {
  const map = new Map();
  for (const card of cards) {
    if (!map.has(card.listId)) map.set(card.listId, []);
    map.get(card.listId).push(card);
  }
  for (const arr of map.values()) arr.sort((a, b) => a[orderKey] - b[orderKey]);
  return map;
}

// Moves `activeId` into `targetListId` at `targetIndex`, reindexing the
// affected list(s) so `orderKey` stays a dense 0..n-1 sequence per list.
// Mirrors the algorithm the backend uses in CardService#moveCard so the
// optimistic UI state matches what the server will persist.
export function moveCardInCards(cards, activeId, targetListId, targetIndex, orderKey) {
  const active = cards.find((c) => c.id === activeId);
  if (!active) return cards;
  const sourceListId = active.listId;

  const byList = groupCardsByList(cards, orderKey);
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
  const reindexedSource = sourceListId === targetListId ? [] : sourceArr.map((c, i) => ({ ...c, [orderKey]: i }));
  const reindexedTarget = targetArr.map((c, i) => ({ ...c, [orderKey]: i }));

  return [...untouched, ...reindexedSource, ...reindexedTarget];
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// Returns the cards of one list sorted by "priority" (high→low, none last) or
// "dueDate" (ascending, none last), reindexed to a dense `order` sequence.
export function sortListCards(cards, key) {
  const sorted = [...cards].sort((a, b) => {
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
  return sorted.map((c, index) => ({ ...c, order: index }));
}
