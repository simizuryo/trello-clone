# 技術スタック

## 9. 技術スタック(v1: フロントエンドのみ・IndexedDB版)
- React + JavaScript + Vite(TypeScriptは今回は対象外)
- ドラッグ&ドロップ: `@dnd-kit`(リスト内並び替え・リスト間移動の両方に対応)
- 状態管理: React標準の `useState` / `useContext`(v1では外部ライブラリ不要)
- データ保存: ブラウザ `IndexedDB`(`idb`ライブラリでPromiseベースにラップして利用)

### 9.0 フロントエンド依存パッケージのバージョン(`app/package.json` / `package-lock.json`時点)
| パッケージ | バージョン | 用途 |
|---|---|---|
| Node.js | 24.x | 実行環境(ローカル確認時点) |
| React / React DOM | 19.2.8 | UIライブラリ |
| Vite | 8.2.1 | 開発サーバー・ビルドツール |
| @vitejs/plugin-react | 6.0.5 | ViteのReact対応プラグイン |
| @dnd-kit/core | 6.3.1 | ドラッグ&ドロップの基盤 |
| @dnd-kit/sortable | 10.0.0 | 並び替え(ソート可能リスト)対応 |
| @dnd-kit/utilities | 3.2.2 | dnd-kit用ユーティリティ(CSS変換等) |
| idb | 8.0.3 | IndexedDBのPromiseラッパー(マイボード/ローカル版で使用) |
| oxlint | 1.77.0 | Lint |

## 9.1 バックエンド構成(実装済み: List/CardのCRUD・検索・Update API、検索(サーバー)画面との連携まで)
- バックエンド: Java 21 + Spring Boot 3.3.4(Maven, `backend/`) + REST API
- データベース: PostgreSQL 16(`docker-compose.yml`でローカル起動、DB名`trello_clone`。イメージ`postgres:16`、確認時点の実バージョンは16.14)
- マイグレーション: Flyway(`flyway-core` / `flyway-database-postgresql`)でスキーマ作成・シードデータ投入を管理
- 現状のスコープ: List/Cardの検索・新規作成に加え、カードのUpdate(タイトル・優先度・期限の変更、リスト内並び替え・リスト間移動)まで実装済み。Deleteは未実装(別Issueで対応予定)
- 起動・確認手順・API仕様は[backend/README.md](../../backend/README.md)を参照

### 9.1.0 バックエンド依存パッケージのバージョン(`backend/pom.xml`時点)
| パッケージ / ツール | バージョン | 用途 |
|---|---|---|
| Java (JDK) | 21 | 実行環境 |
| Maven | 3.9.9 | ビルドツール |
| Spring Boot(`spring-boot-starter-parent`) | 3.3.4 | アプリケーションフレームワーク一式(web / data-jpa / actuator / test を含む) |
| PostgreSQL JDBC Driver | 42.7.4 | DB接続(Spring Boot 3.3.4が管理するバージョン) |
| Flyway(`flyway-core` / `flyway-database-postgresql`) | 10.10.0 | DBマイグレーション(Spring Boot 3.3.4が管理するバージョン) |

## 9.2 フロントエンドとバックエンドの連携状況
- フロントエンド(`app/`)は「マイボード」(IndexedDB, ローカル永続化)と「検索(サーバー)」(Spring Boot API経由でPostgreSQLへ永続化)の2画面をタブで切り替える構成
- 「検索(サーバー)」画面では、List/Cardの検索・新規作成に加え、カードのタイトル・優先度・期限のインライン編集、ドラッグ&ドロップによる並び替え・リスト間移動(完了を表すリストへの移動で完了切替を代替)まで実データ連携で動作する
- 詳細は[スコープ外・拡張ロードマップ](06-scope-and-roadmap.md)を参照
