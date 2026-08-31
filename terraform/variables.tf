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
  description = "ECSタスク定義に使うバックエンドイメージのタグ(ECRへpush後に更新してapplyする)"
  type        = string
  default     = "latest"
}

variable "backend_container_port" {
  description = "バックエンドコンテナがリッスンするポート"
  type        = number
  default     = 8080
}

variable "ecs_task_cpu" {
  description = "ECSタスクのCPUユニット(Fargateの組み合わせ制約に従うこと)"
  type        = string
  default     = "256"
}

variable "ecs_task_memory" {
  description = "ECSタスクのメモリ(MiB)"
  type        = string
  default     = "512"
}

variable "ecs_desired_count" {
  description = "ECSサービスの起動タスク数"
  type        = number
  default     = 1
}

variable "log_retention_days" {
  description = "CloudWatch Logsの保持日数"
  type        = number
  default     = 14
}
