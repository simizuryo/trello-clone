import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PRIORITY_LABEL = { high: "高", medium: "中", low: "低" };

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const [, month, day] = dueDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export default function Card({ card, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    title: card.title,
    priority: card.priority || "",
    dueDate: card.dueDate || "",
  }));

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  function startEdit() {
    setDraft({ title: card.title, priority: card.priority || "", dueDate: card.dueDate || "" });
    setIsEditing(true);
  }

  function save() {
    const title = draft.title.trim();
    onUpdate(card.id, {
      title: title || card.title,
      priority: draft.priority || null,
      dueDate: draft.dueDate || null,
    });
    setIsEditing(false);
  }

  function cancel() {
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <article className="card card-editing" ref={setNodeRef} style={style}>
        <form
          className="card-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <input
            type="text"
            className="card-edit-input"
            value={draft.title}
            autoFocus
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
          />
          <div className="card-edit-row">
            <select
              className="card-edit-select"
              value={draft.priority}
              onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
              aria-label="優先度"
            >
              <option value="">優先度なし</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            <input
              type="date"
              className="card-edit-date"
              value={draft.dueDate}
              onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
              aria-label="期限"
            />
          </div>
          <div className="composer-actions">
            <button type="submit" className="btn-primary">
              保存
            </button>
            <button type="button" className="btn-text" onClick={cancel}>
              キャンセル
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="card" ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="card-body" onClick={startEdit}>
        <span className="card-title">{card.title}</span>
        {(card.priority || card.dueDate) && (
          <div className="card-meta">
            {card.priority && (
              <span className={`priority-badge priority-${card.priority}`}>{PRIORITY_LABEL[card.priority]}</span>
            )}
            {card.dueDate && <span className="due-date">{formatDueDate(card.dueDate)}</span>}
          </div>
        )}
      </div>
      <button
        type="button"
        className="icon-btn card-delete"
        aria-label="カードを削除"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(card.id);
        }}
      >
        ×
      </button>
    </article>
  );
}
