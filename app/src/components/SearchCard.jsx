import { PRIORITY_LABEL, formatDueDate } from "../utils/cardFormat";

export default function SearchCard({ card }) {
  const priorityKey = card.priority ? card.priority.toLowerCase() : null;

  return (
    <article className="card">
      <div className="card-body">
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
