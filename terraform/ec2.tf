# EC2単一インスタンスでバックエンド(+同梱したフロントエンド静的ファイル)コンテナを直接動かす構成。
# ALB + ECS Fargateは無料利用枠の対象外(常時起動で月$25〜30程度)のため、
# 無料利用枠の対象になりうるEC2(t3.micro)上でDockerコンテナを直接起動する方式にしている。
# 詳細は docs/deployment/05-teardown-and-cost.md を参照。

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# EC2用IAMロール: ECRからのイメージpull、SSM Session Manager経由の接続(SSHキー不要)、
# SSM Parameter StoreからのDBパスワード取得に必要な権限を付与する
resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_ecr" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "ec2_db_password" {
  name = "${var.project_name}-ec2-db-password"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = [aws_ssm_parameter.db_password.arn]
      },
      {
        # SSM Parameter Store(SecureString)の復号に使うAWS管理のデフォルトKMSキー(alias/aws/ssm)。
        # kms:ListAliases等の追加権限を避けるため、キーARNを直接指定せず
        # 「SSM経由のリクエストに限定してkms:Decryptを許可する」条件で権限を絞る。
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.ec2_instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  # IMDSv2を必須にし、メタデータサービスへの攻撃(SSRF経由の認証情報窃取等)を防ぐ
  metadata_options {
    http_tokens = "required"
  }

  user_data = templatefile("${path.module}/templates/deploy-backend.sh.tpl", {
    aws_region             = var.aws_region
    ecr_repository_url     = aws_ecr_repository.backend.repository_url
    container_image_tag    = var.container_image_tag
    backend_container_port = var.backend_container_port
    db_host                = aws_db_instance.main.address
    db_port                = aws_db_instance.main.port
    db_name                = var.db_name
    db_username            = var.db_username
    db_password_param_name = aws_ssm_parameter.db_password.name
  })

  tags = {
    Name = "${var.project_name}-backend"
  }
}

resource "aws_eip" "backend" {
  domain   = "vpc"
  instance = aws_instance.backend.id

  tags = {
    Name = "${var.project_name}-backend-eip"
  }
}
