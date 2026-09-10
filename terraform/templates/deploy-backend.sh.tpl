#!/bin/bash
# EC2インスタンス起動時、および再デプロイ時(aws ssm send-command経由)に実行されるスクリプト。
# Terraformのtemplatefile()で値を埋め込んでいる(補間構文の部分)ため、
# シェル変数展開したい箇所は $$ のように$を二重にしてTerraformの補間から除外している。
set -eu -o pipefail

exec > >(tee -a /var/log/deploy-backend.log) 2>&1
echo "=== deploy-backend.sh started at $(date -u +%FT%TZ) ==="

REGION="${aws_region}"
ECR_REPOSITORY_URL="${ecr_repository_url}"
IMAGE_TAG="${container_image_tag}"
CONTAINER_PORT="${backend_container_port}"

# 初回起動時のみ: Docker/AWS CLIをインストールする(再デプロイ時はすでに入っているためスキップされる)
if ! command -v docker >/dev/null 2>&1; then
  dnf install -y docker aws-cli
  systemctl enable --now docker
fi

# ECRへログインし、最新イメージをpullする
aws ecr get-login-password --region "$${REGION}" \
  | docker login --username AWS --password-stdin "$${ECR_REPOSITORY_URL%%/*}"

docker pull "$${ECR_REPOSITORY_URL}:$${IMAGE_TAG}"

# 既存コンテナがあれば置き換える
docker rm -f backend >/dev/null 2>&1 || true

# Phase 1ではRDSがまだ無いため、DB接続情報は渡さない(application.ymlのデフォルト値が使われ、
# DB接続に失敗してアプリの起動が失敗する可能性がある。Phase 2でRDSを追加した時点で解消する想定)。
docker run -d \
  --name backend \
  --restart unless-stopped \
  -p "80:$${CONTAINER_PORT}" \
  "$${ECR_REPOSITORY_URL}:$${IMAGE_TAG}"

echo "=== deploy-backend.sh finished at $(date -u +%FT%TZ) ==="
