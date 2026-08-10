import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SearchCard from "./SearchCard";
import AddCardForm from "./AddCardForm";

export default function SearchList({ list, cards, onAddCard, onUpdateCard }) {
  const { setNodeRef } = useDroppable({ id: list.id });
  const cardIds = cards.map((c) => c.id);

  return (
    <section className="list" aria-label={`${list.title}リスト`}>
      <div className="list-header">
        <h2 className="list-title">{list.title}</h2>
        <span className="list-count">{cards.length}</span>
      </div>

      <div className="card-list" ref={setNodeRef}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.length === 0 && <p className="empty-hint">カードがありません</p>}
          {cards.map((card) => (
            <SearchCard key={card.id} card={card} onUpdate={onUpdateCard} />
          ))}
        </SortableContext>
      </div>

      <AddCardForm onSubmit={(title) => onAddCard(list.id, title)} />
    </section>
  );
}
