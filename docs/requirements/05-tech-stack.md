# 技術スタック

## 9. 技術スタック(v1: フロントエンドのみ)
- React + JavaScript + Vite(TypeScriptは今回は対象外)
- ドラッグ&ドロップ: `@dnd-kit`(リスト内並び替え・リスト間移動の両方に対応)
- 状態管理: React標準の `useState` / `useContext`(v1では外部ライブラリ不要)
- データ保存: ブラウザ `IndexedDB`(`idb`ライブラリでPromiseベースにラップして利用)

## 9.1 将来のバックエンド構成(v2以降・ロードマップ)
- バックエンド: Java + Spring Boot(REST API)
- データベース: PostgreSQL
- フロントエンドはReactのまま、データ永続化先をIndexedDBからバックエンドAPI経由のPostgreSQLへ置き換える想定
- 詳細は[スコープ外・拡張ロードマップ](06-scope-and-roadmap.md)を参照
