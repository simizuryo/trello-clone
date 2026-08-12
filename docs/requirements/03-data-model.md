# データモデル

## 7. データモデル

v4でバックエンド連携(検索(サーバー)画面)を追加したため、フロントエンド専用の「マイボード」用モデル(7.1)と、バックエンド(検索(サーバー)画面が利用するPostgreSQL/JPA)用モデル(7.2)の2系統を持つ。両者はidの型・キー名・priorityの大小文字などが異なり、意図的に統合していない(マイボードはIndexedDBに閉じたローカルモデル、検索(サーバー)画面はバックエンドのAPIレスポンスをそのまま利用するモデル)。

### 7.1 マイボード画面(IndexedDB)のデータモデル
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

IndexedDBのobject store構成:
```
DB: "trello-clone-db"
  ObjectStore "lists"   keyPath: "id"
    { id: string, title: string, order: number }
  ObjectStore "cards"   keyPath: "id", index: "listId"
    { id: string, listId: string, title: string, order: number, priority: string|null, dueDate: string|null }
```

### 7.2 検索(サーバー)画面(PostgreSQL/JPA)のデータモデル

`backend/src/main/resources/db/migration/`のFlywayマイグレーションで定義されているスキーマ(実装済み)。

```sql
lists
  id          BIGSERIAL PRIMARY KEY
  title       VARCHAR(255) NOT NULL
  sort_order  INTEGER NOT NULL DEFAULT 0
  created_at  TIMESTAMP NOT NULL DEFAULT now()

cards
  id          BIGSERIAL PRIMARY KEY
  list_id     BIGINT NOT NULL REFERENCES lists(id) ON DELETE CASCADE
  title       VARCHAR(255) NOT NULL
  sort_order  INTEGER NOT NULL DEFAULT 0
  priority    VARCHAR(10) CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW'))  -- 未設定はNULL
  due_date    DATE
  created_at  TIMESTAMP NOT NULL DEFAULT now()
```

- `sort_order`はマイボードの`order`に相当し、同一リスト内で0始まりの連番を保つ(カード移動・並び替え時にバックエンド側で再採番される)
- `priority`はマイボード側(小文字 `"high"|"medium"|"low"`)と異なり大文字(`HIGH`/`MEDIUM`/`LOW`)。REST APIのリクエスト/レスポンスもこの大文字表記を使う
- `list_id`に外部キー(`ON DELETE CASCADE`)・`priority`/`due_date`にインデックスを付与済み
- リストの削除API(`DELETE /api/lists/{id}`)・カードの削除API(`DELETE /api/cards/{id}`)は未実装(別Issueで対応予定)。API仕様の詳細は[backend/README.md](../../backend/README.md)を参照
