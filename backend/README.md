# trello-clone-backend

学習用Trello風タスク管理アプリのバックエンド(Spring Boot + PostgreSQL)。
List/CardのREAD・検索・新規作成・カードのUpdate(タイトル/優先度/期限・並び替え/リスト間移動)まで実装済み。Deleteは未実装(別Issueで対応予定)。

## 前提

- JDK 21
- Maven 3.9+
- Docker / Docker Compose(PostgreSQLの起動用)

## 1. PostgreSQLを起動する

リポジトリルート(`docker-compose.yml`があるディレクトリ)で実行:

```bash
docker compose up -d
docker compose ps   # postgresがhealthyになっていることを確認
```

接続情報(`docker-compose.yml`と`application.yml`で一致させています):

| 項目 | 値 |
|---|---|
| host:port | localhost:5432 |
| database | trello_clone |
| user | trello |
| password | trello |

## 2. バックエンドを起動する

```bash
cd backend
mvn spring-boot:run
```

起動ログに `Started TrelloCloneBackendApplication` が出れば起動成功。

## 3. DB接続を確認する

```bash
curl http://localhost:8080/actuator/health
```

以下のように `db` コンポーネントが `UP` であればPostgreSQLへの接続が確認できています。

```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP", "details": { "database": "PostgreSQL", ... } },
    ...
  }
}
```

`"status": "DOWN"` の場合は、`docker compose ps` でPostgreSQLコンテナが起動しているか、
`application.yml` の接続情報(ポート/DB名/ユーザー/パスワード)が
`docker-compose.yml` と一致しているかを確認してください。

## 4. List/Card APIを利用する

起動時にFlywayマイグレーションでスキーマ作成とテストデータ投入まで行われます。

| メソッド | パス | クエリパラメータ / リクエストボディ | 説明 |
|---|---|---|---|
| GET | `/api/lists` | なし | リスト一覧(`sortOrder`昇順) |
| GET | `/api/lists/{id}` | なし | リスト単体取得(無ければ404) |
| POST | `/api/lists` | `{ "title": string }` | リスト新規作成(末尾に追加、`sortOrder`は自動採番)。`title`未指定/空は400 |
| GET | `/api/cards` | `listId`, `priority`(`HIGH`/`MEDIUM`/`LOW`), `keyword`(タイトル部分一致・大文字小文字区別なし) | カード検索(全パラメータ省略可・複数指定時はAND、`list.id`→`sortOrder`昇順) |
| GET | `/api/cards/{id}` | なし | カード単体取得(無ければ404) |
| POST | `/api/cards` | `{ "listId": number, "title": string, "priority"?: "HIGH"\|"MEDIUM"\|"LOW"\|null, "dueDate"?: "YYYY-MM-DD"\|null }` | カード新規作成(指定リストの末尾に追加、`sortOrder`は自動採番)。`title`未指定/空・`listId`未指定・存在しない`listId`・不正な`priority`は400 |
| PATCH | `/api/cards/{id}` | `{ "title": string, "priority"?: "HIGH"\|"MEDIUM"\|"LOW"\|null, "dueDate"?: "YYYY-MM-DD"\|null }` | カードのタイトル・優先度・期限を更新(3項目とも置き換え)。`title`未指定/空は400、存在しない`id`は404、不正な`priority`は400 |
| PATCH | `/api/cards/{id}/position` | `{ "listId": number, "sortOrder": number }` | カードを指定リストの指定位置(0始まり)へ移動。同一リスト内なら並び替え、別リストなら移動(「完了」を表すリストへ移動すれば完了切替を兼ねる)。移動元・移動先リストの`sortOrder`は隙間なく再採番される。`listId`/`sortOrder`未指定は400、存在しないカード/リストはそれぞれ404/400 |

```bash
curl http://localhost:8080/api/lists
curl "http://localhost:8080/api/cards?priority=HIGH&keyword=%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC"
curl -X POST http://localhost:8080/api/lists \
  -H "Content-Type: application/json" \
  -d '{"title":"レビュー待ち"}'
curl -X POST http://localhost:8080/api/cards \
  -H "Content-Type: application/json" \
  -d '{"listId":1,"title":"新しいタスク","priority":"MEDIUM","dueDate":"2026-09-01"}'
curl -X PATCH http://localhost:8080/api/cards/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"新しいタスク","priority":"HIGH","dueDate":"2026-09-10"}'
curl -X PATCH http://localhost:8080/api/cards/1/position \
  -H "Content-Type: application/json" \
  -d '{"listId":3,"sortOrder":0}'
```

CORSは `application.yml` の `app.cors.allowed-origins` で許可オリジンを設定しています(デフォルトはフロントエンド(`app/`)の開発サーバー `http://localhost:5173`)。許可メソッドは `GET`, `POST`, `PATCH` です。

## 停止・後片付け

```bash
docker compose down        # コンテナを停止(データは保持)
docker compose down -v     # データも含めて完全に削除する場合
```
