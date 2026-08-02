# 技術スタック

## 9. 技術スタック(v1: フロントエンドのみ)
- React + JavaScript + Vite(TypeScriptは今回は対象外)
- ドラッグ&ドロップ: `@dnd-kit`(リスト内並び替え・リスト間移動の両方に対応)
- 状態管理: React標準の `useState` / `useContext`(v1では外部ライブラリ不要)
- データ保存: ブラウザ `IndexedDB`(`idb`ライブラリでPromiseベースにラップして利用)

## 9.1 バックエンド構成(着手済み: DB接続確認まで)
- バックエンド: Java 21 + Spring Boot 3(Maven, `backend/`) + REST API(未実装)
- データベース: PostgreSQL 16(`docker-compose.yml`でローカル起動、DB名`trello_clone`)
- 現状のスコープ: `docker compose up -d` でPostgreSQLを起動し、Spring Bootの`spring-boot-starter-data-jpa`経由でDB接続できることを`/actuator/health`で確認できるところまで。List/CardのCRUD APIおよびフロントエンドとの連携は未着手
- 起動・確認手順は[backend/README.md](../../backend/README.md)を参照
- フロントエンドはReactのまま、データ永続化先を将来的にIndexedDBからバックエンドAPI経由のPostgreSQLへ置き換える想定
- 詳細は[スコープ外・拡張ロードマップ](06-scope-and-roadmap.md)を参照
