import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { useBoard } from "../context/BoardContext";
import List from "./List";
import AddListForm from "./AddListForm";
import ConfirmDialog from "./ConfirmDialog";
import { groupCardsByList as groupCardsByListBase, moveCardInCards } from "../utils/cardOrder";

function byOrder(a, b) {
  return a.order - b.order;
}

function groupCardsByList(cards) {
  return groupCardsByListBase(cards, "order");
}

function moveCard(cards, activeId, targetListId, targetIndex) {
  return moveCardInCards(cards, activeId, targetListId, targetIndex, "order");
}

export default function Board() {
  const { lists, cards, addList, renameList, removeList, addCard, updateCard, removeCard, setCardsLive, commitCardOrder, sortList } =
    useBoard();
  const [pendingDeleteListId, setPendingDeleteListId] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [touchedListIds, setTouchedListIds] = useState(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const sortedLists = [...lists].sort(byOrder);
  const cardsByList = groupCardsByList(cards);

  function handleDragStart(event) {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card || null);
    setTouchedListIds(card ? new Set([card.listId]) : new Set());
  }

  function resolveTargetListId(overId) {
    if (lists.some((l) => l.id === overId)) return overId;
    const overCard = cards.find((c) => c.id === overId);
    return overCard ? overCard.listId : null;
  }

  function resolveTargetIndex(overId, targetListId) {
    const overCard = cards.find((c) => c.id === overId);
    if (!overCard) return (cardsByList.get(targetListId) || []).length;
    const arr = cardsByList.get(targetListId) || [];
    return arr.findIndex((c) => c.id === overId);
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over) return;
    const activeCardData = cards.find((c) => c.id === active.id);
    if (!activeCardData) return;

    const targetListId = resolveTargetListId(over.id);
    if (!targetListId) return;

    const targetIndex = resolveTargetIndex(over.id, targetListId);
    if (activeCardData.listId === targetListId) {
      const arr = cardsByList.get(targetListId) || [];
      const currentIndex = arr.findIndex((c) => c.id === active.id);
      if (currentIndex === targetIndex || currentIndex === -1) return;
    }

    setTouchedListIds((prev) => new Set(prev).add(targetListId));
    setCardsLive(moveCard(cards, active.id, targetListId, targetIndex));
  }

  function handleDragEnd() {
    if (touchedListIds.size > 0) {
      commitCardOrder([...touchedListIds]);
    }
    setActiveCard(null);
    setTouchedListIds(new Set());
  }

  function handleDragCancel() {
    setActiveCard(null);
    setTouchedListIds(new Set());
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <main className="board" aria-label="カンバンボード">
        {sortedLists.map((list) => (
          <List
            key={list.id}
            list={list}
            cards={cardsByList.get(list.id) || []}
            onRename={renameList}
            onDeleteRequest={setPendingDeleteListId}
            onAddCard={addCard}
            onUpdateCard={updateCard}
            onDeleteCard={removeCard}
            onSort={sortList}
          />
        ))}
        <AddListForm onSubmit={addList} />
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

      <ConfirmDialog
        open={pendingDeleteListId !== null}
        title="リストを削除しますか？"
        body="中のカードもすべて削除されます。この操作は元に戻せません。"
        confirmLabel="削除する"
        onCancel={() => setPendingDeleteListId(null)}
        onConfirm={() => {
          removeList(pendingDeleteListId);
          setPendingDeleteListId(null);
        }}
      />
    </DndContext>
  );
}
