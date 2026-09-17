variable "project_name" {
  description = "リソース名のプレフィックスとして使う識別子"
  type        = string
  default     = "trello-clone"
}

variable "aws_region" {
  description = "リソースを作成するAWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "vpc_cidr" {
  description = "VPCのCIDRブロック"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "利用するアベイラビリティゾーン(2つ指定する)"
  type        = list(string)
  default     = ["ap-northeast-1a", "ap-northeast-1c"]
}

variable "db_name" {
  description = "RDSに作成するデータベース名"
  type        = string
  default     = "trello_clone"
}

variable "db_username" {
  description = "RDSのマスターユーザー名"
  type        = string
  default     = "trello"
}

variable "db_instance_class" {
  description = "RDSのインスタンスクラス"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDSのストレージサイズ(GB)"
  type        = number
  default     = 20
}

variable "container_image_tag" {
  description = "EC2上で起動するバックエンドイメージのタグ(ECRへpush後に更新してapplyするか、再デプロイスクリプトで反映する)"
  type        = string
  default     = "latest"
}

variable "backend_container_port" {
  description = "バックエンドコンテナがリッスンするポート(コンテナ内部。ホスト側は80で公開する)"
  type        = number
  default     = 8080
}

variable "ec2_instance_type" {
  description = "バックエンドを動かすEC2インスタンスタイプ(t3.microはap-northeast-1の無料利用枠対象)"
  type        = string
  default     = "t3.micro"
}
