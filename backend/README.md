# trello-clone-backend

学習用Trello風タスク管理アプリのバックエンド(Spring Boot + PostgreSQL)。
現時点ではDB接続確認までのスコープで、CRUD APIは未実装。

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

## 停止・後片付け

```bash
docker compose down        # コンテナを停止(データは保持)
docker compose down -v     # データも含めて完全に削除する場合
```
