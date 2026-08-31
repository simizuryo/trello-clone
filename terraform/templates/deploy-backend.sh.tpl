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
DB_HOST="${db_host}"
DB_PORT="${db_port}"
DB_NAME="${db_name}"
DB_USERNAME="${db_username}"
DB_PASSWORD_SECRET_ARN="${db_password_secret_arn}"
CORS_ALLOWED_ORIGINS="${cors_allowed_origins}"

# 初回起動時のみ: Docker/AWS CLIをインストールする(再デプロイ時はすでに入っているためスキップされる)
if ! command -v docker >/dev/null 2>&1; then
  dnf install -y docker aws-cli
  systemctl enable --now docker
fi

# ECRへログインし、最新イメージをpullする
aws ecr get-login-password --region "$${REGION}" \
  | docker login --username AWS --password-stdin "$${ECR_REPOSITORY_URL%%/*}"

docker pull "$${ECR_REPOSITORY_URL}:$${IMAGE_TAG}"

# Secrets ManagerからDBパスワードを取得する(EC2のIAMロールに読み取り権限を付与済み)
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --region "$${REGION}" \
  --secret-id "$${DB_PASSWORD_SECRET_ARN}" \
  --query SecretString --output text)

# 既存コンテナがあれば置き換える
docker rm -f backend >/dev/null 2>&1 || true

docker run -d \
  --name backend \
  --restart unless-stopped \
  -p "80:$${CONTAINER_PORT}" \
  -e "SPRING_DATASOURCE_URL=jdbc:postgresql://$${DB_HOST}:$${DB_PORT}/$${DB_NAME}" \
  -e "SPRING_DATASOURCE_USERNAME=$${DB_USERNAME}" \
  -e "SPRING_DATASOURCE_PASSWORD=$${DB_PASSWORD}" \
  -e "APP_CORS_ALLOWED_ORIGINS=$${CORS_ALLOWED_ORIGINS}" \
  "$${ECR_REPOSITORY_URL}:$${IMAGE_TAG}"

echo "=== deploy-backend.sh finished at $(date -u +%FT%TZ) ==="
