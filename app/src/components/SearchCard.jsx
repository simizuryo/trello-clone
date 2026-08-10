import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PRIORITY_LABEL, formatDueDate } from "../utils/cardFormat";

export default function SearchCard({ card, onUpdate }) {
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

  const priorityKey = card.priority ? card.priority.toLowerCase() : null;

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
              <option value="HIGH">高</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
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
        {(priorityKey || card.dueDate) && (
          <div className="card-meta">
            {priorityKey && (
              <span className={`priority-badge priority-${priorityKey}`}>{PRIORITY_LABEL[priorityKey]}</span>
            )}
            {card.dueDate && <span className="due-date">{formatDueDate(card.dueDate)}</span>}
          </div>
        )}
      </div>
    </article>
  );
}
