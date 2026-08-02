import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Card from "./Card";
import AddCardForm from "./AddCardForm";

export default function List({ list, cards, onRename, onDeleteRequest, onAddCard, onUpdateCard, onDeleteCard, onSort }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);

  const { setNodeRef } = useDroppable({ id: list.id });
  const cardIds = cards.map((c) => c.id);

  function commitTitle() {
    onRename(list.id, titleDraft);
    setIsEditingTitle(false);
  }

  return (
    <section className="list" aria-label={`${list.title}リスト`}>
      <div className="list-header">
        {isEditingTitle ? (
          <input
            type="text"
            className="list-title-input"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
              } else if (e.key === "Escape") {
                setTitleDraft(list.title);
                setIsEditingTitle(false);
              }
            }}
          />
        ) : (
          <h2
            className="list-title"
            tabIndex={0}
            role="button"
            title="クリックしてリスト名を編集"
            onClick={() => {
              setTitleDraft(list.title);
              setIsEditingTitle(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setTitleDraft(list.title);
                setIsEditingTitle(true);
              }
            }}
          >
            {list.title}
          </h2>
        )}
        <span className="list-count">{cards.length}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`${list.title}リストを削除`}
          onClick={() => onDeleteRequest(list.id)}
        >
          ×
        </button>
      </div>

      <div className="sort-buttons">
        <button type="button" className="btn-text sort-btn" onClick={() => onSort(list.id, "priority")}>
          優先順
        </button>
        <button type="button" className="btn-text sort-btn" onClick={() => onSort(list.id, "dueDate")}>
          期限順
        </button>
      </div>

      <div className="card-list" ref={setNodeRef}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.length === 0 && <p className="empty-hint">カードがありません</p>}
          {cards.map((card) => (
            <Card key={card.id} card={card} onUpdate={onUpdateCard} onDelete={onDeleteCard} />
          ))}
        </SortableContext>
      </div>

      <AddCardForm onSubmit={(title) => onAddCard(list.id, title)} />
    </section>
  );
}
