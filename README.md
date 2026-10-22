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
| バックエンド | logstash-logback-encoder(JSONログ) | 8.0 |
| データベース | PostgreSQL(Docker) | 16系(イメージ`postgres:16`) |
| テスト | Vitest / Testing Library(FE)、JUnit 5 / Mockito(BE)、Playwright(E2E) | 5.0.5 / 16.3.3、Spring Boot 3.3.4管理、1.64.1 |

フロントエンドはTypeScriptを使わずJavaScriptで実装。バージョンの詳細・依存パッケージ一覧は [05-tech-stack.md](docs/requirements/05-tech-stack.md) を参照。

## プロジェクト構成

```
.
├── app/                 # フロントエンド(React + Vite)
│   ├── src/
│   │   ├── api/         # バックエンドAPIクライアント
│   │   ├── components/  # 画面・UIコンポーネント
│   │   ├── context/     # マイボードの状態管理(BoardContext)
│   │   ├── db/          # IndexedDB(idb)ラッパー
│   │   ├── hooks/       # カスタムフック
│   │   ├── test/        # テストのセットアップ・画面単位の統合テスト
│   │   └── utils/       # 表示整形・並び替えロジック・logger
│   └── e2e/             # Playwright E2Eテスト
├── backend/             # バックエンド(Spring Boot + PostgreSQL)
│   └── src/main/java/com/example/trelloclone/
│       ├── controller/  # REST APIエンドポイント
│       ├── service/     # カードの並び替え・移動などのビジネスロジック
│       ├── entity/       # JPAエンティティ
│       ├── repository/   # Spring Data JPAリポジトリ
│       ├── dto/          # リクエスト/レスポンスDTO
│       ├── config/       # CORS設定など
│       └── logging/      # 相関IDフィルタ・ログのマスキング
├── docs/
│   ├── requirements.md         # 要件定義書(索引)
│   ├── requirements/           # 要件定義書(項目ごとに分割)
│   └── prototype/index.html    # 画面プロトタイプ(静的HTML)
├── .github/workflows/   # CI(GitHub Actions)
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

## テスト

テスト・構造化ロギング・CIはPR #21(Issue #19、2026-10-21)でまとめて導入した。導入前はフロントエンドにテストがなく、バックエンドもDBを使うテストが数件あるだけだった。2026-10-22時点でフロントエンド57件・バックエンド64件・E2E 3件。

| 種類 | 対象 | ツール | 実行コマンド |
|---|---|---|---|
| 単体 | FE: 表示整形・並び替えロジック・reducer・フック・APIクライアント・logger | Vitest + Testing Library | `cd app && npm test` |
| 単体 | BE: `CardService`・リクエスト検証(`@WebMvcTest`)・相関IDフィルタ・マスキング | JUnit 5 + Mockito | `cd backend && mvn test` |
| 統合 | FE: マイボード(fake IndexedDB)/検索(サーバー)画面(疑似API)を画面単位で操作 | Vitest + Testing Library | `cd app && npm test`(単体と同時に実行) |
| 統合 | BE: REST API → JPA → PostgreSQL、ログ出力(JSON・相関ID・マスキング) | Spring Boot Test + MockMvc | `cd backend && mvn test`(**PostgreSQL起動が必要**) |
| E2E | 最重要フロー: マイボード/検索(サーバー)でのリスト・カード作成→編集→ドラッグ移動→リロード後の永続化 | Playwright(Chromium) | `cd app && npm run test:e2e` |

- バックエンドのテストはDBを使うものがあるため、先に `docker compose up -d` しておく。各テストはトランザクション内で実行されロールバックされる。
- E2Eは初回のみ `npx playwright install chromium` が必要。バックエンド(8080)・フロントエンド(5173)が起動済みならそれを使い、未起動なら自動で起動する(バックエンドの起動コマンドは環境変数 `E2E_BACKEND_COMMAND` で変更可)。検索(サーバー)のE2EはDBにリスト・カードを作成する(削除APIがないため)ので、開発用データを汚したくない場合は別DBを指定してバックエンドを起動しておく:
  ```bash
  docker exec trello-clone-postgres createdb -U trello trello_clone_e2e
  cd backend && SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/trello_clone_e2e mvn spring-boot:run
  ```
- E2Eが失敗すると、フルページのスクリーンショットとトレースが `app/test-results/<テスト名>/` に保存される(`npx playwright show-trace <trace.zip>` で再生可能)。HTMLレポートは `app/playwright-report/`。

### テスト一覧

| 種類 | ファイル | 確認内容 | 件数 |
|---|---|---|---|
| 単体(FE) | `app/src/utils/cardOrder.test.js` | カードの並び替え・リスト間移動・ソート | 12 |
| 単体(FE) | `app/src/utils/logger.test.js` | レベル判定、JSON形式、マスキング、リクエストIDの生成 | 10 |
| 単体(FE) | `app/src/api/client.test.js` | 各APIの呼び出し内容、`X-Request-Id`の付与、通信エラーの扱い | 11 |
| 単体(FE) | `app/src/context/boardReducer.test.js` | マイボードの状態遷移 | 6 |
| 単体(FE) | `app/src/utils/cardFormat.test.js`、`app/src/hooks/useDebouncedValue.test.js` | 表示整形、入力のデバウンス | 6 |
| 統合(FE) | `app/src/test/SearchBoardScreen.integration.test.jsx` | 検索(サーバー)画面を疑似APIで操作 | 8 |
| 統合(FE) | `app/src/test/Board.integration.test.jsx` | マイボードを疑似IndexedDBで操作 | 4 |
| 単体(BE) | `CardControllerValidationTest` | リクエストの入力チェック(`@WebMvcTest`) | 15 |
| 単体(BE) | `CardServiceTest`、`CardUpdateTest` | カードの更新・移動ロジック(Mockito) | 13 |
| 単体(BE) | `RequestCorrelationFilterTest`、`SensitiveDataMaskerTest` | 相関IDフィルタ、マスキング | 22 |
| 統合(BE) | `CardApiIntegrationTest`、`ListApiIntegrationTest` | REST API → JPA → PostgreSQL | 8 |
| 統合(BE) | `LoggingIntegrationTest` | 実際のログ出力(JSON・相関ID・マスキング) | 5 |
| 統合(BE) | `TrelloCloneBackendApplicationTests` | アプリケーションの起動 | 1 |
| E2E | `app/e2e/my-board.spec.js` | マイボード: 作成→編集→ドラッグ→リロード後の永続化 | 1 |
| E2E | `app/e2e/server-board.spec.js` | 検索(サーバー): 同じ流れを実際のバックエンドで。全API通信の`X-Request-Id`も確認 | 1 |
| E2E | `app/e2e/server-board-many-lists.spec.js` | リスト20件でのリスト間ドラッグ(Issue #20の回帰テスト、PR #22で追加) | 1 |

件数はVitest・Maven Surefireで実際に実行されるテストケースの数(2026-10-22時点、パラメータ化テストは1パターンを1件と数える)。

## ロギング

バックエンドは1行1JSONの構造化ログを標準出力に出す。

```json
{"timestamp":"2026-10-21T21:48:55.886+09:00","message":"HTTP request completed method=GET path=/api/lists status=200 durationMs=195","logger_name":"com.example.trelloclone.logging.RequestCorrelationFilter","thread_name":"http-nio-8080-exec-4","level":"INFO","requestId":"e2e-check-1","method":"GET","path":"/api/lists","status":200,"durationMs":195,"app":"trello-clone-backend"}
```

- **相関ID**: リクエストヘッダ `X-Request-Id` が妥当な形式(英数字と `._-`、64文字以内)ならその値を使い、それ以外はUUIDを生成する。値はそのリクエスト中のすべてのログの `requestId` に入り、レスポンスヘッダ `X-Request-Id` にも返す。フロントエンドのAPIクライアントは呼び出しごとにIDを付けて送るため、ブラウザのログとサーバーのログを同じIDで突き合わせられる。
- **アクセスログ**: リクエストごとにメソッド・パス(クエリ文字列は含めない)・ステータス・処理時間を1行出す。5xxと未処理例外はERRORレベル。
- **マスキング**: `password` / `token` / `secret` / `api_key` / `Authorization` などの値、`Bearer` トークン、メールアドレスのローカル部を `****` に置き換える(メッセージ・構造化フィールド・スタックトレースのすべてが対象)。
- **設定(環境変数)**:

  | 変数 | 既定値 | 説明 |
  |---|---|---|
  | `LOG_FORMAT` | `json` | `plain` にすると人が読みやすい1行形式(相関IDとマスキングは同じく有効) |
  | `LOG_LEVEL` | `INFO` | アプリ(`com.example.trelloclone`)のログレベル |
  | `SQL_LOG_LEVEL` | `DEBUG` | 実行SQLのログ(`org.hibernate.SQL`)。`INFO` にすると出力しない |

フロントエンドは `app/src/utils/logger.js` が同じ形式(timestamp / level / logger / message + コンテキスト)のJSONをブラウザのコンソールに出し、同じルールでマスキングする。レベルは `VITE_LOG_LEVEL`(`debug` / `info` / `warn` / `error` / `silent`、既定は開発時 `debug`・本番ビルド `info`)で変更できる。

## CI

`.github/workflows/ci.yml` で、PRとmainへのpushごとに以下を自動実行する。

1. **Frontend**: lint → 単体・統合テスト → ビルド
2. **Backend**: PostgreSQLサービスコンテナを起動して `mvn verify`(単体・統合テスト)
3. **E2E**: 1と2が成功したら、空のPostgreSQLに対してバックエンドとフロントエンドを起動してPlaywrightを実行する。失敗時はスクリーンショット・トレース・HTMLレポートを成果物 `e2e-failure-artifacts` としてアップロードする(保持14日)

## AWSへのデプロイ

AWS CLI + Terraformを使ってAWS上にデプロイする手順は [docs/deployment/](docs/deployment/) にまとめている。AWS/Terraform/IaCが初めての場合の解説から、認証設定・実際のデプロイ手順・コストの目安までを含む。

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
- [docs/deployment/](docs/deployment/) — AWS(Terraform)へのデプロイ手順・IaC解説
  - [00-concepts.md](docs/deployment/00-concepts.md) AWS/IaC/Terraformの基本概念
  - [01-account-and-cli-setup.md](docs/deployment/01-account-and-cli-setup.md) AWSアカウント・IAM・CLIの設定
  - [02-terraform-setup.md](docs/deployment/02-terraform-setup.md) Terraformのセットアップ
  - [03-architecture.md](docs/deployment/03-architecture.md) AWS構成の全体像
  - [04-deploy-runbook.md](docs/deployment/04-deploy-runbook.md) デプロイ手順
  - [05-teardown-and-cost.md](docs/deployment/05-teardown-and-cost.md) コストの見積もりと後片付け
