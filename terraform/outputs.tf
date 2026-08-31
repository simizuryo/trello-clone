output "backend_url" {
  description = "バックエンドAPIのエンドポイント(EC2のElastic IP)。フロントエンドのVITE_API_BASE_URLに使う"
  value       = "http://${aws_eip.backend.public_ip}"
}

output "ec2_instance_id" {
  description = "バックエンドを動かすEC2のインスタンスID。aws ssm start-session --target で使う"
  value       = aws_instance.backend.id
}

output "cloudfront_domain_name" {
  description = "フロントエンドの公開URL(CloudFront)"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "ecr_repository_url" {
  description = "バックエンドイメージのpush先ECRリポジトリURL"
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "RDSのエンドポイント(ホスト:ポート)"
  value       = aws_db_instance.main.endpoint
}

output "frontend_bucket_name" {
  description = "フロントエンドの静的ファイルをアップロードするS3バケット名"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "デプロイ後にキャッシュ無効化(invalidation)する際に使うCloudFront Distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

