import SearchCard from "./SearchCard";

export default function SearchList({ list, cards }) {
  return (
    <section className="list" aria-label={`${list.title}リスト`}>
      <div className="list-header">
        <h2 className="list-title">{list.title}</h2>
        <span className="list-count">{cards.length}</span>
      </div>

      <div className="card-list">
        {cards.length === 0 && <p className="empty-hint">カードがありません</p>}
        {cards.map((card) => (
          <SearchCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
