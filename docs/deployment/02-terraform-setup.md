# 02. Terraformのセットアップ

## Terraformをインストールする(Windows)

PowerShellで確認:

```powershell
terraform -version
```

インストールされていなければ:

```powershell
winget install -e --id Hashicorp.Terraform
```

新しいシェルで `terraform -version` を実行し、`Terraform v1.x` のようにバージョンが表示されればOK(このプロジェクトは `>= 1.7.0` を前提にしている)。

## tfstateの管理方針: なぜローカルにしているか

Terraformは「今どんなリソースを作ったか」を **tfstate(ステートファイル)** に記録する。保存先には大きく2種類ある。

| 方式 | 説明 | メリット | デメリット |
|---|---|---|---|
| ローカルバックエンド(今回採用) | 実行したマシンの`terraform/terraform.tfstate`にそのまま保存 | 追加のAWSリソースが不要ですぐ始められる | 複数人・複数マシンで共有できない。ファイルを紛失すると管理不能になる |
| リモートバックエンド(S3 + DynamoDB) | tfstateをS3に保存し、DynamoDBで同時実行をロックする | チームでの共同作業や、CI/CDからの実行に向く | S3バケット・DynamoDBテーブル自体を先に用意する「鶏と卵」の手順が必要 |

このプロジェクトは**個人の学習用途で、実行するのもClaude Code(このマシン)のみ**という前提のため、まずはシンプルなローカルバックエンドを使う。tfstateには**DBパスワードなどの秘密情報も平文で含まれる**ため、`terraform/`配下の`*.tfstate`は`.gitignore`で除外している。**このファイルを絶対にコミットしないこと。**

チーム開発に発展させる場合や、CI/CDから自動デプロイするようにしたい場合は、リモートバックエンドへの移行を検討する(このドキュメントの範囲外)。

## ディレクトリ構成

```
terraform/
├── versions.tf              # Terraform / プロバイダのバージョン制約
├── providers.tf             # AWSプロバイダ設定
├── variables.tf             # 変数定義
├── network.tf                # VPC・サブネット・ルートテーブル
├── security_groups.tf        # セキュリティグループ
├── ecr.tf                    # ECR(コンテナイメージ置き場)
├── rds.tf                    # RDS(PostgreSQL)・DBパスワード管理
├── ec2.tf                     # バックエンド用EC2インスタンス・Elastic IP
├── templates/
│   └── deploy-backend.sh.tpl  # EC2起動/再デプロイ時のスクリプト
├── s3_cloudfront.tf           # フロントエンド配信(S3 + CloudFront)
├── outputs.tf                 # apply後に表示される値
├── terraform.tfvars.example   # 変数の設定例(コミット対象)
└── terraform.tfvars           # 実際の変数値(gitignore対象、各自作成する)
```

Terraformは同じディレクトリ内の`.tf`ファイルを全て読み込んで1つの構成として扱う。ファイルを機能ごとに分けているのは人間が読みやすくするためで、Terraform自体はファイル名やファイル分割を意識しない。

## 初期化する

```powershell
cd terraform
Copy-Item terraform.tfvars.example terraform.tfvars
terraform init
```

`terraform init` は、`versions.tf`に書かれたAWSプロバイダ(AWSを操作するためのプラグイン)をダウンロードし、`.terraform/`ディレクトリに配置する。初回や`versions.tf`を変更したときに実行する。

初期化が終わると `.terraform.lock.hcl` というファイルが生成される。これは使用するプロバイダのバージョンを固定するロックファイルで、再現性のためにコミットする。

---

次は [03-architecture.md](03-architecture.md) で、実際に作成するAWS構成の全体像を確認する。
