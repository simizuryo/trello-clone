output "backend_url" {
  description = "アプリのURL(EC2のElastic IP)。フロントエンド画面・バックエンドAPIの両方をこのURLで配信する"
  value       = "http://${aws_eip.backend.public_ip}"
}

output "ec2_instance_id" {
  description = "バックエンドを動かすEC2のインスタンスID。aws ssm start-session --target で使う"
  value       = aws_instance.backend.id
}

output "ecr_repository_url" {
  description = "バックエンドイメージのpush先ECRリポジトリURL"
  value       = aws_ecr_repository.backend.repository_url
}
