# 04. デプロイ手順(Runbook)

[01](01-account-and-cli-setup.md)・[02](02-terraform-setup.md)が完了している前提。すべてPowerShellでのコマンド例。

このドキュメントはPhase 2時点(EC2 + RDS)の手順。S3/CloudFrontはまだ無い(詳細は[03-architecture.md](03-architecture.md))。

## 全体の流れ

1. `terraform apply` でAWSインフラ(VPC・EC2・RDS・ECR)を作成(この時点ではECRにまだイメージが無く、初回起動時のコンテナ起動は失敗する。想定通り)
2. フロントエンド+バックエンドを同梱したDockerイメージをビルドしてECRへpush
3. SSM経由でEC2上のデプロイスクリプトを実行し、新しいイメージ・RDS接続情報を反映
4. 動作確認

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

> **RDSの作成には10〜15分程度かかることがある**。途中で止まっているように見えても異常ではない。

```powershell
terraform output
```

以降のコマンドで使うため、主要な値を変数に入れておく。

```powershell
$ECR_REPO    = terraform output -raw ecr_repository_url
$BACKEND_URL = terraform output -raw backend_url
$INSTANCE_ID = terraform output -raw ec2_instance_id
```

## 2. フロントエンド+バックエンドを同梱したイメージをビルドしてECRへpush

`backend/Dockerfile` はフロントエンド(`app/`)のビルドも含むマルチステージ構成になっているため、**リポジトリのルートをビルドコンテキストにして**ビルドする。

```powershell
cd ..
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$AWS_REGION = "ap-northeast-1"

# ECRへのdockerログイン
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# ビルド(リポジトリルートが起点、-fでDockerfileの場所を指定) & push
# タグはterraform.tfvarsのcontainer_image_tagと合わせる(デフォルトは latest)
docker build -f backend/Dockerfile -t "${ECR_REPO}:latest" .
docker push "${ECR_REPO}:latest"
```

## 3. EC2に反映する(SSM経由でデプロイスクリプトを実行)

EC2インスタンスには起動時に自動生成されたデプロイスクリプト `/usr/local/bin/deploy-backend.sh` が置かれている(中身は`terraform/templates/deploy-backend.sh.tpl`)。SSHキーなしで、AWS CLIから直接このスクリプトを実行させる。このスクリプトはSSM Parameter StoreからDBパスワードを取得し、RDSの接続情報とあわせてコンテナに渡す。

```powershell
aws ssm send-command `
  --instance-ids $INSTANCE_ID `
  --document-name "AWS-RunShellScript" `
  --parameters commands="/usr/local/bin/deploy-backend.sh" `
  --region $AWS_REGION
```

実行結果(コマンドID)が表示される。進捗・成否は以下で確認できる。

```powershell
$COMMAND_ID = "<↑で表示されたCommand Id>"
aws ssm get-command-invocation --command-id $COMMAND_ID --instance-id $INSTANCE_ID --region $AWS_REGION
```

`Status`が`Success`になれば完了。数十秒〜1分程度かかる。

ヘルスチェック確認(200が返ればOK):

```powershell
curl "$BACKEND_URL/actuator/health"
```

うまくいかない場合は、SSM Session Managerで直接ログを確認できる。

```powershell
aws ssm start-session --target $INSTANCE_ID
```

```bash
sudo cat /var/log/deploy-backend.log   # デプロイスクリプト自体のログ(イメージpull・DBパスワード取得ができたか)
sudo docker ps -a                      # backendコンテナが起動中か、再起動を繰り返していないか
sudo docker logs backend               # アプリケーションのログ(DB接続エラー等はここに出る)
```

## 4. 動作確認

```powershell
# ヘルスチェック(DB接続を含めUPであることを確認)
curl "$BACKEND_URL/actuator/health"

# ブラウザで画面を開く
Start-Process $BACKEND_URL
```

「検索(サーバー)」画面が表示され、リスト・カードの検索や新規作成がバックエンドAPI経由(RDS読み書き)で行えることを確認する。

## 2回目以降の再デプロイ

アプリのコードを変更した場合は、手順2〜3を再実行すればよい(インフラ自体に変更がなければ`terraform apply`は不要)。Terraformのコード自体(`terraform/`配下)を変更した場合は、`terraform plan`で差分を確認してから`terraform apply`する。

> EC2の`user_data`(起動スクリプト)はインスタンスの**初回起動時にしか自動実行されない**仕様のため、スクリプトの中身自体を変更した場合(`deploy-backend.sh.tpl`を編集した場合)は、`terraform apply`後にSSM経由で手動実行するか、インスタンスを作り直す必要がある。

---

作業が終わったら、課金を止めるための後片付け手順を [05-teardown-and-cost.md](05-teardown-and-cost.md) で確認する。
