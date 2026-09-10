# Phase 1: EC2単一インスタンスでバックエンド(+同梱したフロントエンド静的ファイル)コンテナを直接動かす構成。
# ALB + ECS Fargateは無料利用枠の対象外(常時起動で月$25〜30程度)のため、
# 無料利用枠の対象になりうるEC2(t3.micro)上でDockerコンテナを直接起動する方式にしている。
# RDSはまだ無いため、このコンテナはDB接続に失敗して起動しない可能性がある(Phase 2でRDSを追加後に解消する想定)。
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

# EC2用IAMロール: ECRからのイメージpull、SSM Session Manager経由の接続(SSHキー不要)に必要な権限を付与する
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
