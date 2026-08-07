import { useEffect, useState } from "react";
import { fetchLists, searchCards } from "../api/client";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import SearchList from "./SearchList";

export default function SearchBoardScreen() {
  const [keyword, setKeyword] = useState("");
  const [priority, setPriority] = useState("");
  const [listId, setListId] = useState("");
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const debouncedKeyword = useDebouncedValue(keyword, 300);

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

  const cardsByListId = new Map();
  for (const card of cards) {
    const bucket = cardsByListId.get(card.listId) ?? [];
    bucket.push(card);
    cardsByListId.set(card.listId, bucket);
  }

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

      <main className="board" aria-label="検索結果ボード">
        {lists.map((list) => (
          <SearchList key={list.id} list={list} cards={cardsByListId.get(list.id) ?? []} />
        ))}
      </main>
    </>
  );
}
