resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"

  # 学習用途で terraform destroy を気軽に実行できるよう、
  # イメージが残っていてもリポジトリを削除できるようにしている
  force_delete = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# 古いイメージを自動的に整理し、ECRのストレージ費用を抑える
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
