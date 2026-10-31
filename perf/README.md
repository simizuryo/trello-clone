# パフォーマンステスト

非機能要件「リスト10・各リスト50件(合計500件)までは、操作時の応答が体感200ms以内」([02-non-functional-requirements.md](../docs/requirements/02-non-functional-requirements.md))を検証するための負荷テスト。CIでは実行せず、性能に影響しそうな変更の前後やAWSへのデプロイ時など、任意のタイミングで手動実行する。

- ツール: [k6](https://grafana.com/docs/k6/)(Dockerイメージ `grafana/k6:2.2.0`)。ローカルへのインストールは不要
- データ投入: `postgres:16` イメージの `psql` で専用DB `trello_clone_perf` に直接投入する
- 合否のしきい値: p95 < 200ms(環境変数 `TARGET_P95_MS` で変更可)

## 構成

```
perf/
├── docker-compose.yml   # k6・データ投入用psqlの実行環境
├── k6/
│   ├── baseline.js      # エンドポイント別の応答時間
│   ├── user-flow.js     # 画面操作単位(複数リクエストの合計)の応答時間
│   └── lib/common.js    # APIクライアント・X-Request-Id付与・結果出力
├── seed/seed.sql        # データ投入(件数を指定可能)
└── results/             # 実行結果JSON(git管理外)
```

## シナリオ

| シナリオ | 内容 | 判定するメトリクス |
|---|---|---|
| `baseline.js` | 1ユーザーで全エンドポイントを順に呼ぶ(既定: ウォームアップ30秒 + 計測1分) | エンドポイント別の `http_req_duration` p95 |
| `user-flow.js` | 検索(サーバー)画面の操作を、画面が実際に送るリクエストの組み合わせで再現する(既定: ウォームアップ30秒 + 計測3分、思考時間1秒) | 操作別の `op_*` p95(下表) |

| メトリクス | 操作 | リクエスト |
|---|---|---|
| `op_initial_load` | 初期表示 | `GET /api/lists` と `GET /api/cards` を並行 |
| `op_search` | 検索・絞り込み | `GET /api/cards?keyword=...` / `?priority=...` |
| `op_create_card` | カード作成 | `POST /api/cards` |
| `op_edit_card` | インライン編集 | `PATCH /api/cards/{id}` |
| `op_drag_card` | ドラッグ&ドロップ | `PATCH /api/cards/{id}/position` → `GET /api/cards`(移動後の再取得) |

- 判定はウォームアップ後の計測区間(`scenario:measure`)だけで行う。JVMのJITやコネクションプールが温まる前の値を含めないため
- 編集・移動はカードの件数を変えないように行う(編集は同じ内容で更新、移動はランダムなリストのランダムな位置へ)。`user-flow.js` のカード作成だけはデータが増える(1反復1件)ので、**実行前に毎回データを投入し直す**
- しきい値を超えると k6 は終了コード 99 を返し、該当メトリクスに `✗` が付く

## 実行手順

コマンドはすべてリポジトリルートで実行する。Git Bash では `export MSYS_NO_PATHCONV=1` を先に実行しておく(コンテナ内のパス `/scripts/...` が Windows のパスに変換されてしまうため)。

### 1. 計測用DBを作成する(初回のみ)

```bash
docker compose up -d
docker exec trello-clone-postgres createdb -U trello trello_clone_perf
```

### 2. バックエンドを計測用DBに向けて起動する

SQLログ(既定 `DEBUG`)は計測値に上乗せされるため、本番と同じ `INFO` にしておく。

```bash
# bash
cd backend
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/trello_clone_perf SQL_LOG_LEVEL=INFO mvn spring-boot:run
```

```powershell
# PowerShell
cd backend
$env:SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/trello_clone_perf'; $env:SQL_LOG_LEVEL='INFO'; mvn spring-boot:run
```

起動時にFlywayがスキーマを作成する。

### 3. データを投入する

既存のリスト・カードを削除してから投入する。既定はリスト10 × 各50件(合計500件)。DB名が `_perf` で終わらない場合はエラーで中断するので、開発用DBを消してしまうことはない。

```bash
docker compose -f perf/docker-compose.yml run --rm seed                          # 10 × 50 = 500件
docker compose -f perf/docker-compose.yml run --rm seed -v lists=10 -v cards=200 # 10 × 200 = 2,000件
```

### 4. k6を実行する

```bash
docker compose -f perf/docker-compose.yml run --rm k6 run -q /scripts/baseline.js
docker compose -f perf/docker-compose.yml run --rm k6 run -q /scripts/user-flow.js
```

`-e` で実行条件を変更できる。

```bash
# 計測時間を短くして動作確認する
docker compose -f perf/docker-compose.yml run --rm -e WARMUP=5s -e DURATION=15s k6 run -q /scripts/baseline.js
# 同時3ユーザーで操作する
docker compose -f perf/docker-compose.yml run --rm -e VUS=3 k6 run -q /scripts/user-flow.js
```

| 変数 | 既定値 | 説明 |
|---|---|---|
| `BASE_URL` | `http://host.docker.internal:8080` | 計測対象。AWS上で計測する場合は `http://<Elastic IP>` |
| `WARMUP` | `30s` | ウォームアップ時間(判定に含めない) |
| `DURATION` | `1m`(baseline)/ `3m`(user-flow) | 計測時間 |
| `VUS` | `1` | 同時ユーザー数(user-flowのみ) |
| `THINK_TIME` | `1` | 操作の合間の待ち時間・秒(user-flowのみ) |
| `TARGET_P95_MS` | `200` | 合否判定のしきい値 |

`BASE_URL` はホスト側の環境変数としても指定できる(例: `BASE_URL=http://203.0.113.10 docker compose -f perf/docker-compose.yml run --rm k6 run -q /scripts/baseline.js`)。

### 5. 結果を確認する

- 標準出力に集計結果(avg / med / p90 / p95 / p99 / max)が出る
- 同じ内容のJSONが `perf/results/<シナリオ>-<UTC日時>.json` に保存される
- k6のリクエストには `X-Request-Id: perf-<シナリオ>-<VU>-<反復>-<連番>` が付くので、遅いリクエストをバックエンドのJSONログ(`requestId`・`durationMs`)で特定できる

### 後片付け

```bash
docker exec trello-clone-postgres dropdb -U trello --force trello_clone_perf
```

## 計測記録

| 日付 | コミット | 環境 | データ | シナリオ | 結果 |
|---|---|---|---|---|---|
| 2026-10-31 | Issue #25 のブランチ | ローカル(Windows 11、Docker Desktop上のPostgreSQL 16、`SQL_LOG_LEVEL=INFO`) | 10 × 50 = 500件 | baseline | 全エンドポイント合格。p95: `GET /api/cards` 49ms、`GET /api/lists` 44ms、絞り込み検索 20〜21ms、`PATCH /api/cards/{id}` 13ms、`PATCH /api/cards/{id}/position` **155ms**(最も遅い) |
| 2026-10-31 | 同上 | 同上 | 同上 | user-flow(1 VU) | **`op_drag_card` が不合格(p95 247ms、中央値 172ms)**。その他の操作の p95: 初期表示 74ms、検索 54ms、作成 66ms、編集 36ms |
| 2026-10-31 | Issue #27 のブランチ(JDBCバッチ更新を有効化) | 同上 | 同上 | baseline | 全エンドポイント合格。`PATCH /api/cards/{id}/position` の p95 が 151ms → **40〜45ms**(同じ環境で変更前後を計測。変更前の値は再計測したもの) |
| 2026-10-31 | 同上 | 同上 | 同上 | user-flow(1 VU) | **全操作合格**。`op_drag_card` の p95 が 281ms → **124〜170ms**(中央値 171ms → 87〜94ms)。2回計測した範囲を記載 |

ドラッグ&ドロップは、カード移動のAPIと、移動後のカード一覧の再取得を合わせた時間。移動APIは移動元・移動先リストの全カードの並び順を振り直すため、1回の移動で最大約100件のUPDATEが発行される。当初はこれを1件ずつDBに送っていたため想定データ量でも200msを超えていたが、Issue #27 でJDBCのバッチ更新(`hibernate.jdbc.batch_size`)を有効にし、数回の通信で送るようにして要件を満たした。
