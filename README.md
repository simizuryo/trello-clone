# trello-clone

Trello風のタスク管理(カンバンボード)アプリ。プログラミングスクールの学習課題として開発している。React + Vite + `@dnd-kit`によるフロントエンド実装(IndexedDBでのローカル永続化)を軸に、Java + Spring Boot + PostgreSQLによるバックエンド連携までを学習範囲として拡張している。

詳細な要件定義は [docs/requirements.md](docs/requirements.md) にまとまっている。本READMEはプロジェクト全体のセットアップ・技術スタック・実装状況の要約。

## 目的・スコープ

- 目的: コンポーネント設計・状態管理・ドラッグ&ドロップ・ブラウザ内DB(IndexedDB)・REST API連携といった技術要素を、Trello風カンバンアプリの実装を通じて一通り習得する
- 対象ユーザー: 開発者本人によるローカル利用(単一ユーザー、認証なし)
- 用語: **ボード**(カンバン全体、v1では1つのみ) > **リスト**(カードをグルーピングする列。例: 未着手/進行中/完了) > **カード**(1タスクを表す最小単位)

詳細は [00-overview.md](docs/requirements/00-overview.md) を参照。

## 画面構成

アプリには2つの画面(タブ)がある。

| 画面 | データ永続化先 | 実装状況 |
|---|---|---|
| マイボード | ブラウザ`IndexedDB`(`idb`ライブラリ) | リスト/カードの追加・編集・削除、ドラッグ&ドロップでの並び替え・リスト間移動、優先順/期限順のワンショットソートまで実装済み |
| 検索(サーバー) | Spring Boot REST API 経由の PostgreSQL | リスト/カードの検索(キーワード・優先度・リストで絞り込み)・新規作成に加え、カードのタイトル・優先度・期限のインライン編集、ドラッグ&ドロップでの並び替え・リスト間移動まで実装済み(削除は未実装) |

いずれの画面もリスト・カードの基本UIは共通で、カード全体をドラッグハンドルとして掴んで移動し、カードタイトルをクリックするとインライン編集モードに切り替わる。画面イメージの詳細は [04-screen-design.md](docs/requirements/04-screen-design.md) を参照。

「検索(サーバー)」画面での完了切替は、独立した完了フラグを設けず、カードを「完了」を表すリストへドラッグ&ドロップで移動することで代替している。

## 技術スタック

| レイヤー | 技術 | バージョン |
|---|---|---|
| フロントエンド | React / React DOM | 19.2.8 |
| フロントエンド | Vite | 8.2.1 |
| フロントエンド | @dnd-kit(core / sortable / utilities) | 6.3.1 / 10.0.0 / 3.2.2 |
| フロントエンド(マイボード) | idb(IndexedDBラッパー) | 8.0.3 |
| バックエンド | Java | 21 |
| バックエンド | Spring Boot(web / data-jpa / actuator / test) | 3.3.4 |
| バックエンド | Flyway(DBマイグレーション) | 10.10.0 |
| データベース | PostgreSQL(Docker) | 16系(イメージ`postgres:16`) |

フロントエンドはTypeScriptを使わずJavaScriptで実装。バージョンの詳細・依存パッケージ一覧は [05-tech-stack.md](docs/requirements/05-tech-stack.md) を参照。

## プロジェクト構成

```
.
├── app/                 # フロントエンド(React + Vite)
│   └── src/
│       ├── api/         # バックエンドAPIクライアント
│       ├── components/  # 画面・UIコンポーネント
│       ├── context/     # マイボードの状態管理(BoardContext)
│       ├── db/          # IndexedDB(idb)ラッパー
│       ├── hooks/        # カスタムフック
│       └── utils/        # 表示整形などのユーティリティ
├── backend/             # バックエンド(Spring Boot + PostgreSQL)
│   └── src/main/java/com/example/trelloclone/
│       ├── controller/  # REST APIエンドポイント
│       ├── service/     # カードの並び替え・移動などのビジネスロジック
│       ├── entity/       # JPAエンティティ
│       ├── repository/   # Spring Data JPAリポジトリ
│       ├── dto/          # リクエスト/レスポンスDTO
│       └── config/       # CORS設定など
├── docs/
│   ├── requirements.md         # 要件定義書(索引)
│   ├── requirements/           # 要件定義書(項目ごとに分割)
│   └── prototype/index.html    # 画面プロトタイプ(静的HTML)
├── docker-compose.yml   # PostgreSQLのローカル起動用
└── CLAUDE.md            # 開発ルール(Issue駆動・ブランチ運用・PRフロー)
```

## セットアップ・起動手順

前提: Node.js, JDK 21, Maven 3.9+, Docker / Docker Compose

### 1. PostgreSQLを起動する

リポジトリルートで実行:

```bash
docker compose up -d
docker compose ps   # postgresがhealthyになっていることを確認
```

### 2. バックエンドを起動する(ポート8080)

```bash
cd backend
mvn spring-boot:run
```

起動後、`curl http://localhost:8080/actuator/health` で `"status": "UP"` を確認できる。起動時にFlywayマイグレーションでスキーマ作成・テストデータ投入まで行われる。API仕様の詳細は [backend/README.md](backend/README.md) を参照。

### 3. フロントエンドを起動する(ポート5173)

```bash
cd app
npm install
npm run dev
```

`http://localhost:5173/` を開くと、右上のタブで「マイボード」(バックエンド不要・IndexedDBのみで動作)と「検索(サーバー)」(要バックエンド起動)を切り替えられる。フロントエンドのAPI接続先は`app/.env.local`の`VITE_API_BASE_URL`(デフォルト`http://localhost:8080`)で設定する。

### 停止

```bash
docker compose down        # PostgreSQLコンテナを停止(データは保持)
docker compose down -v     # データも含めて完全に削除する場合
```

## 開発ルール

Issue駆動開発・ブランチ命名規則・PRフローなど、このリポジトリで変更を行う際のルールは [CLAUDE.md](CLAUDE.md) にまとめている。

## ドキュメント一覧

- [docs/requirements.md](docs/requirements.md) — 要件定義書(索引)
  - [00-overview.md](docs/requirements/00-overview.md) 概要・対象ユーザー・用語定義
  - [01-functional-requirements.md](docs/requirements/01-functional-requirements.md) 機能要件・受け入れ基準
  - [02-non-functional-requirements.md](docs/requirements/02-non-functional-requirements.md) 非機能要件
  - [03-data-model.md](docs/requirements/03-data-model.md) データモデル
  - [04-screen-design.md](docs/requirements/04-screen-design.md) 画面構成・画面イメージ
  - [05-tech-stack.md](docs/requirements/05-tech-stack.md) 技術スタック
  - [06-scope-and-roadmap.md](docs/requirements/06-scope-and-roadmap.md) スコープ外・拡張ロードマップ
  - [07-schedule-deliverables.md](docs/requirements/07-schedule-deliverables.md) スケジュール・成果物
  - [08-change-management.md](docs/requirements/08-change-management.md) 変更管理
  - [09-open-questions.md](docs/requirements/09-open-questions.md) 要確認ポイント
- [docs/prototype/index.html](docs/prototype/index.html) — 画面プロトタイプ(静的HTML、ドラッグ&ドロップ含む)
- [backend/README.md](backend/README.md) — バックエンドのセットアップ手順・API仕様
