# terraform

AWS上にこのアプリをデプロイするためのTerraformコード。初めての場合は先に以下のドキュメントを読むこと。

- [docs/deployment/00-concepts.md](../docs/deployment/00-concepts.md) IaC/Terraformの基本概念
- [docs/deployment/01-account-and-cli-setup.md](../docs/deployment/01-account-and-cli-setup.md) AWSアカウント・IAM・CLIの設定
- [docs/deployment/02-terraform-setup.md](../docs/deployment/02-terraform-setup.md) Terraformのインストールとこのディレクトリの構成
- [docs/deployment/03-architecture.md](../docs/deployment/03-architecture.md) 構築するAWS構成の解説
- [docs/deployment/04-deploy-runbook.md](../docs/deployment/04-deploy-runbook.md) 実際のデプロイ手順(このREADMEはその一部の要約)
- [docs/deployment/05-teardown-and-cost.md](../docs/deployment/05-teardown-and-cost.md) コストと後片付け

## 構成ファイル

| ファイル | 内容 |
|---|---|
| `versions.tf` | Terraform / プロバイダのバージョン制約 |
| `providers.tf` | AWSプロバイダ設定 |
| `variables.tf` | 変数定義 |
| `network.tf` | VPC・サブネット・ルートテーブル |
| `security_groups.tf` | ALB/ECS/RDS用セキュリティグループ |
| `ecr.tf` | バックエンドイメージ用ECRリポジトリ |
| `rds.tf` | RDS(PostgreSQL)・Secrets Manager(DBパスワード) |
| `alb.tf` | ALB・ターゲットグループ・リスナー |
| `ecs.tf` | ECSクラスタ・タスク定義・サービス・IAMロール |
| `s3_cloudfront.tf` | フロントエンド配信用S3・CloudFront |
| `outputs.tf` | apply後に表示される値(ALBのURL、CloudFrontのURL等) |

## 使い方

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # 初回のみ。必要に応じて値を編集
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

`apply`はAWS上に実際にリソースを作成し課金が発生する。内容を理解してから実行すること。

`apply`完了後に表示される出力値(`terraform output`で再確認可能)を使って、Dockerイメージのビルド・push、フロントエンドのビルド・アップロードを行う。手順は [docs/deployment/04-deploy-runbook.md](../docs/deployment/04-deploy-runbook.md) を参照。

## 削除する

使い終わったら課金を止めるために削除する。

```bash
terraform destroy
```

詳細は [docs/deployment/05-teardown-and-cost.md](../docs/deployment/05-teardown-and-cost.md)。
