# データモデル

## 7. データモデル(案)
```
List: { id: string, title: string, order: number }
Card: {
  id: string,
  listId: string,
  title: string,
  order: number,
  priority: "high" | "medium" | "low" | null,
  dueDate: string | null  // ISO 8601 日付文字列 (例: "2026-08-15")
}
```

- `order` はドラッグ&ドロップによる自由な並び替えのための値。優先順・期限順ソートボタンはこの`order`を一括で書き換えるワンショット操作であり、専用のソートモードや優先度・期限に紐づく固定ソートは持たない

IndexedDBのobject store構成(案):
```
DB: "trello-clone-db"
  ObjectStore "lists"   keyPath: "id"
    { id: string, title: string, order: number }
  ObjectStore "cards"   keyPath: "id", index: "listId"
    { id: string, listId: string, title: string, order: number, priority: string|null, dueDate: string|null }
```
