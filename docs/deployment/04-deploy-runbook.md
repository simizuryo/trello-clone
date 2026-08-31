# 04. デプロイ手順(Runbook)

[01](01-account-and-cli-setup.md)・[02](02-terraform-setup.md)が完了している前提。すべてPowerShellでのコマンド例。

## 全体の流れ

1. `terraform apply` でAWSインフラを作成(この時点ではECSにまだアプリのイメージがなく、コンテナは起動失敗を繰り返す。想定通り)
2. バックエンドのDockerイメージをビルドしてECRへpush
3. ECSサービスに新しいイメージを反映
4. フロントエンドをビルドしてS3へアップロード、CloudFrontのキャッシュを無効化
5. 動作確認

## 1. インフラを作成する

```powershell
cd terraform
terraform init
terraform plan
```

`plan`の出力を確認する。`+`は新規作成、`-`は削除、`~`は変更を表す。内容に問題なければ:

```powershell
terraform apply
```

確認プロンプトで `yes` を入力する。完了すると `outputs.tf` で定義した値が表示される。以後 `terraform output` でいつでも再確認できる。

> **初回applyは10〜20分程度かかることがある**。特にCloudFrontディストリビューションは世界中のエッジロケーションへ設定を配信し終えるまで時間がかかる。途中で止まっているように見えても異常ではない。

```powershell
terraform output
```

以降のコマンドで使うため、主要な値を変数に入れておく。

```powershell
$ECR_REPO   = terraform output -raw ecr_repository_url
$ALB_URL    = terraform output -raw alb_dns_name
$CF_URL     = terraform output -raw cloudfront_domain_name
$BUCKET     = terraform output -raw frontend_bucket_name
$CF_DIST_ID = terraform output -raw cloudfront_distribution_id
$ECS_CLUSTER = terraform output -raw ecs_cluster_name
$ECS_SERVICE = terraform output -raw ecs_service_name
```

## 2. バックエンドイメージをビルドしてECRへpush

リポジトリのルートに戻る。

```powershell
cd ..
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$AWS_REGION = "ap-northeast-1"

# ECRへのdockerログイン
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# ビルド & push(タグはterraform.tfvarsのcontainer_image_tagと合わせる。デフォルトは latest)
docker build -t "${ECR_REPO}:latest" ./backend
docker push "${ECR_REPO}:latest"
```

## 3. ECSサービスに反映する

初回applyの時点でECSサービスは`:latest`タグを見に行くよう設定済みなので、pushが終わればECSは自動的に再試行して起動する(数十秒〜数分待つ)。すぐに反映させたい場合は強制的に新しいデプロイを走らせる。

```powershell
aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --force-new-deployment --region $AWS_REGION
```

起動状況の確認:

```powershell
aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION --query "services[0].deployments"
```

ヘルスチェック確認(200が返ればOK。ALB作成直後はDNS反映やターゲット登録に数分かかることがある):

```powershell
curl "$ALB_URL/actuator/health"
```

## 4. フロントエンドをビルドしてデプロイする

`VITE_API_BASE_URL` にALBのURLを指定してビルドする。

```powershell
cd app
$env:VITE_API_BASE_URL = $ALB_URL
npm install
npm run build
cd ..
```

生成された `app/dist` の中身をS3へアップロードする。

```powershell
aws s3 sync app/dist "s3://$BUCKET" --delete
```

CloudFrontはキャッシュを持っているため、更新を即座に反映するにはキャッシュ無効化(invalidation)を行う。

```powershell
aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"
```

## 5. 動作確認

```powershell
# 立ち上げたURLをブラウザで開く
Start-Process $CF_URL
```

「検索(サーバー)」画面が表示され、リスト・カードの検索や新規作成がバックエンドAPI経由で行えることを確認する。

## 2回目以降の再デプロイ

アプリのコードを変更した場合は、変更した側だけ手順2〜4を再実行すればよい(インフラ自体に変更がなければ`terraform apply`は不要)。Terraformのコード自体(`terraform/`配下)を変更した場合は、`terraform plan`で差分を確認してから`terraform apply`する。

---

作業が終わったら、課金を止めるための後片付け手順を [05-teardown-and-cost.md](05-teardown-and-cost.md) で確認する。
