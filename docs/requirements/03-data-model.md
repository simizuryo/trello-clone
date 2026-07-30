# データモデル

## 7. データモデル(案)
```
List: { id: string, title: string, order: number }
Card: { id: string, listId: string, title: string, order: number }
```

IndexedDBのobject store構成(案):
```
DB: "trello-clone-db"
  ObjectStore "lists"   keyPath: "id"
    { id: string, title: string, order: number }
  ObjectStore "cards"   keyPath: "id", index: "listId"
    { id: string, listId: string, title: string, order: number }
```
