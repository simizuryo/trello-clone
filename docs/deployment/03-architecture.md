# 03. AWS構成の全体像

このプロジェクトは、一気に全部を構築するのではなく**段階的に**AWS構成を作っていく。

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 1 | EC2 1台にフロントエンド(静的ファイル)+バックエンドAPIを同梱したコンテナを立てる | **今回の対象** |
| Phase 2 | RDS(PostgreSQL)を追加し、EC2上のコンテナから接続する | 未着手 |
| Phase 3(検討中) | フロントエンドをS3+CloudFrontに分離する | 未着手・採用するかも含めて検討中 |

このドキュメントはPhase 1の構成を説明する。

## 構成図(Phase 1)

```mermaid
flowchart TB
    User["利用者のブラウザ"]

    subgraph AWS["AWS (ap-northeast-1)"]
        subgraph VPC["VPC"]
            subgraph Public["パブリックサブネット x2"]
                EC2["EC2 (t3.micro)\nSpring Bootコンテナ\n(フロントエンド静的ファイル + API)\n+ Elastic IP"]
            end
        end

        ECR["ECR\nバックエンド(+フロントエンド同梱)Dockerイメージ"]
        SSMSVC["SSM\n(Session Manager)"]
    end

    User -- "HTTP :80(画面表示・API呼び出し)" --> EC2
    EC2 -. "起動/再デプロイ時にイメージpull" .-> ECR
    SSMSVC -. "鍵不要のシェル接続・コマンド実行" .-> EC2
```

Phase 2でRDS(プライベートサブネット)、Phase 3(検討中)でS3/CloudFrontが図に追加される想定。

## 各リソースの役割

### ネットワーク(`network.tf`, `security_groups.tf`)

- **VPC**: このプロジェクト専用の仮想ネットワーク(`10.0.0.0/16`)
- **パブリックサブネット x2**: 異なるアベイラビリティゾーン(データセンター)に1つずつ配置。バックエンドを動かすEC2インスタンスを置く。インターネットゲートウェイ経由で外部と直接通信できる
- **セキュリティグループ**: 通信を許可する範囲を絞るファイアウォール。「EC2は誰からでも80番ポートを受ける」という必要最小限の通信だけを許可している

Phase 2でRDSを追加する際、プライベートサブネットとRDS用セキュリティグループを再度追加する(コスト削減のためNATゲートウェイは作らない方針は維持する)。

### バックエンド実行基盤(`ecr.tf`, `ec2.tf`)

- **ECR**: `backend/Dockerfile` からビルドしたコンテナイメージを保管するプライベートなDockerレジストリ。このイメージには、`app/`(React)をビルドした静的ファイルも `src/main/resources/static/` として同梱されている(Spring Bootが自動的に配信する)
- **EC2(t3.micro)**: フロントエンド画面+バックエンドAPIを1つのコンテナとして動かす1台のインスタンス。ALBやECSのようなマネージドな実行基盤は使わず、起動時にEC2自身がECRからイメージをpullしてDockerコンテナとして起動する(`terraform/templates/deploy-backend.sh.tpl`)。t3.microはAWSの無料利用枠の対象になりうるインスタンスタイプ
- **Elastic IP**: EC2に紐づく固定のパブリックIPアドレス。インスタンスを再起動してもIPアドレスが変わらない
- **SSM(Systems Manager) Session Manager**: SSHキーを使わずにEC2へシェル接続・コマンド実行できる仕組み。ポート22を一切開けていないため、鍵の管理や紛失のリスクがない

> 元々はALB + ECS Fargateの構成も検討したが、**どちらも無料利用枠の対象外**(常時起動で合計月$25〜30程度)なため、無料利用枠の対象になりうるEC2単一インスタンス構成にした。詳細は[05-teardown-and-cost.md](05-teardown-and-cost.md)。

### フロントエンドとバックエンドの同居について

個人・学習用途で認証もなく利用者もEC2 1台で十分なため、Phase 1では**S3+CloudFrontを使わず、フロントエンドとバックエンドを同じコンテナ・同じEC2で動かす**。React(`app/`)のビルド成果物をSpring Bootの静的リソースとして同梱し、1つのDockerイメージ・1つのポート(80番)でどちらも配信する。

メリット:
- 同一オリジンになるため、本番環境ではCORS設定が不要
- リソースが少なく、構成もシンプル(VPC・セキュリティグループもEC2用の1つだけ)

デメリット(将来S3+CloudFrontへ分離する場合の動機):
- CDNによるキャッシュ・高速配信が無い
- HTTPS化するにはEC2側で証明書を用意する必要がある(Phase 1ではHTTPのみ)
- フロントエンドの変更だけでもバックエンドの再ビルド・再デプロイが必要になる

### 現時点でまだ無いもの(Phase 2以降)

- **RDS(PostgreSQL)**: Phase 1のEC2上のコンテナはDB接続先が無いため、アプリの起動(データベース接続)に失敗する可能性がある。これはPhase 1の時点では想定内で、Phase 2でRDSを追加した後に解消する
- **Secrets Manager**: RDSのパスワード管理と合わせてPhase 2で追加する

## トラブルシューティング(SSM接続)

コンテナのログを見たい、起動スクリプトの実行結果を確認したいといった場合は、SSHキーなしでEC2に接続できる。

```powershell
aws ssm start-session --target <ec2_instance_idの値>
```

接続後、以下でログを確認できる。

```bash
sudo cat /var/log/deploy-backend.log   # 起動/再デプロイスクリプトのログ
sudo docker logs backend               # アプリケーションのログ
```

---

構成を理解したら、次は [04-deploy-runbook.md](04-deploy-runbook.md) で実際にデプロイする。
