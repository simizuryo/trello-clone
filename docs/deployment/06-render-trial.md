# 06. Renderの無料枠でのデプロイ検証

AWS以外のデプロイ先としてRenderを評価するための手順。定義はリポジトリルートの `render.yaml` にある(Issue #33)。

## 構成

| リソース | プラン | 備考 |
|---|---|---|
| Webサービス `trello-clone` | Free(512MB / 0.1 CPU) | `backend/Dockerfile` のイメージで、フロントエンドとAPIを配信する |
| PostgreSQL `trello-clone-db` | Free(1GB) | 30日で期限切れ。バックアップなし |

リージョンはシンガポール。Renderに日本のリージョンはない。

## デプロイ手順

1. Renderのアカウントを作成し、GitHubと連携する
   - GitHubでログインした場合も、登録メールアドレスの確認が必要
   - Render の GitHub App は「Only select repositories」で `simizuryo/trello-clone` だけに許可すればよい
2. ダッシュボードで「New」→「Blueprint」を選ぶ
3. `simizuryo/trello-clone` を選び、Blueprint名(例: `trello-clone`)と `render.yaml` があるブランチを指定する
4. 内容を確認して「Deploy Blueprint」を押す。ビルドと起動には数分以上かかる

Webサービスの URL は `https://trello-clone-<ランダムな文字列>.onrender.com` の形式になる。サービス名だけでは決まらないので、ダッシュボードで確認する。

## デプロイ後の確認

- `https://<URL>/actuator/health` が `{"status":"UP","groups":["liveness","readiness"]}` を返す(DB情報などの詳細は含まない)
- 画面を開き、「検索(サーバー)」タブでカードを作成・移動できる
- 再読み込みしてもデータが残っている

## 無料枠の注意点

- 15分間通信がないと停止する。Renderは復帰に約1分としているが、このアプリは起動が遅いためより長くかかる見込み
- 無料のPostgreSQLは作成から30日で期限切れになり、14日の猶予後にデータごと削除される
- 認証がないアプリなので、URLを知っていれば誰でもデータを変更できる。検証が終わったらサービスを削除する

## ローカルでの事前検証結果(2026-11-06)

Dockerで同じ制限(512MB / 0.1 CPU)をかけて計測した。Render上の実測ではない。

| 項目 | 結果 |
|---|---|
| 起動完了まで | 214秒 |
| メモリ使用量 | 約187MiB(OOMなし) |
| 起動後の最初のAPI応答 | 約3.4秒 |

## Render上での確認結果(2026-11-17)

`main`(d507a02)から Blueprint で作成した。

| 項目 | 結果 |
|---|---|
| Blueprint作成からLiveまで | 約7分(ビルド約2分、起動約3分) |
| `/actuator/health` | 200。`{"status":"UP","groups":["liveness","readiness"]}` |
| `/`、`/api/lists` | 200。初期データのリスト3件を返した |
| DB接続 | 「検索(サーバー)」タブに初期データのカードが表示された |
| カード作成・移動(API) | `POST /api/cards` で作成し、`PATCH /api/cards/{id}/position` で別リストへ移動できた。移動の応答は約0.56秒 |
| 再読み込み | 再読み込み後も移動後の状態が残っていた |

確認できていないこと・補足:

- 画面上のドラッグ&ドロップは、ブラウザ自動操作の擬似ドラッグでは反応せず、確認できていない。手で操作して確認する
- Git Bash の curl で日本語タイトルのリストを `POST /api/lists` すると 400 になった。文字コードの問題とみられるが、原因は確かめていない
- 確認用に作成したカード `render-trial-card` が残っている。カード削除APIはないため、サービス削除時に消える
- 無料のPostgreSQLは 2026-12-17 ごろに期限切れになる

## 削除

Renderのダッシュボードで、Blueprintに含まれるWebサービスとPostgreSQLを削除する。
