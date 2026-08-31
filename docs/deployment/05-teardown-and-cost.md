# 05. コストの見積もりと後片付け

## 概算コスト(東京リージョン、常時起動した場合の月額目安)

| リソース | 目安月額 | 備考 |
|---|---|---|
| ALB | 約$16 + データ処理量 | 起動している時間に対して課金(時間課金) |
| ECS Fargate(0.25 vCPU / 0.5GB, 1タスク) | 約$10 | 起動している時間に対して課金 |
| RDS(db.t4g.micro, 20GB, シングルAZ) | 約$15 | 起動している時間 + ストレージに対して課金 |
| Secrets Manager | 約$0.4 | シークレット1件あたり固定 + API呼び出し |
| S3 / ECR / CloudFront | 数十円〜(ほぼ無視できる) | 学習用途のデータ量では小さい |
| **合計(常時起動)** | **概ね $40〜45 / 月** | 為替・実際の使用量により変動 |

ALB・ECS・RDSはいずれも**起動している時間に応じた課金**のため、四六時中動かし続けなければこの金額よりずっと安くなる。逆に言えば、**使い終わったら`terraform destroy`で消さない限り、使っていなくても課金され続ける**。

正確な金額は必ず [AWS料金計算ツール](https://calculator.aws) や実際の請求(Billing Dashboard)で確認すること。上記はあくまで目安。

## 学習セッションごとの運用の勧め

1. 動作確認したいときに `terraform apply` でインフラを作る
2. 検証が終わったら `terraform destroy` で削除する
3. 次回また `terraform apply` すれば同じ構成が再現される(これがIaCの利点)

ECR(イメージ)やS3(ビルド成果物)は`destroy`で中身ごと削除されるよう設定してある(`force_delete` / `force_destroy`)。次回`apply`後に手順2〜4([04-deploy-runbook.md](04-deploy-runbook.md))を再実行してイメージ・静的ファイルを作り直す想定。

## 削除する

```powershell
cd terraform
terraform plan -destroy   # 何が削除されるか事前確認
terraform destroy
```

確認プロンプトで `yes` を入力する。数分かかることがある(特にRDS・ALBの削除)。

完了したら、AWSコンソールの各サービス画面(EC2/ECS/RDS/S3/CloudFront等)やBilling Dashboardで、意図しないリソースが残っていないか一度目視確認しておくと安心。

## 予算アラート

[01-account-and-cli-setup.md](01-account-and-cli-setup.md) の手順7で設定したAWS Budgetsのアラートは、`destroy`後も残しておいてよい。今後別の検証をする際の安全網になる。
