# 01. AWSアカウント・IAM・CLIの設定

Terraformを実行する前に、AWS側の認証まわりを整える。ここは唯一「AWSマネジメントコンソールを手動で触る」パートであり、Claude Codeが代行できない(AWSアカウントの持ち主本人の操作が必要なため)。

## 1. AWSアカウントを確認する

すでにAWSアカウント(サインアップ済み)を持っている前提。[https://aws.amazon.com/console/](https://aws.amazon.com/console/) からログインできることを確認する。

ログインする際のユーザーには2種類ある。

- **ルートユーザー**: アカウント作成時のメールアドレスでログインするユーザー。**全ての操作が可能**で、誤操作・漏洩時の被害が最大になるため、日常的な作業には使わない。
- **IAMユーザー**: ルートユーザーが作成する、権限を絞った個別のユーザー。普段の作業はこちらを使う。

## 2. IAMユーザーを作成する(コンソール操作)

1. ルートユーザーでコンソールにログイン
2. 検索窓で「IAM」と入力してIAMのページを開く
3. 左メニュー「ユーザー」→「ユーザーを作成」
4. ユーザー名を入力(例: `terraform-deploy`)
5. アクセス許可の設定で「ポリシーを直接アタッチする」を選び、`AdministratorAccess` をアタッチする

> **なぜAdministratorAccessなのか**: 本来は必要な権限だけに絞った方が安全(最小権限の原則)。ただし今回のように「VPC・ECS・RDS・S3・CloudFrontなど多数のサービスを横断的に作る個人の学習用アカウント」では、必要な権限を都度洗い出すコストの方が大きい。**個人の検証用アカウントであること・本番の顧客データを扱わないこと**を前提に、学習の第一歩としてAdministratorAccessを許容する。会社のアカウントや本番運用では、サービスごとに絞ったポリシーを使うこと。

## 3. ルートユーザーにMFA(多要素認証)を設定する

IAMユーザーを作ったら、ルートユーザー自体の保護も強化しておく。

1. IAMのダッシュボードにある「セキュリティ推奨事項」または「ルートユーザーのMFAを追加」から設定
2. スマートフォンの認証アプリ(Google Authenticator等)でQRコードを読み取り、仮想MFAデバイスとして登録

## 4. アクセスキーを発行する(IAMユーザー用)

AWS CLI/Terraformから使う認証情報を発行する。

1. 作成したIAMユーザーの詳細ページ →「セキュリティ認証情報」タブ
2. 「アクセスキーを作成」→ ユースケースは「コマンドラインインターフェイス (CLI)」を選択
3. 表示される **アクセスキーID** と **シークレットアクセスキー** を控える(シークレットアクセスキーはこの画面でしか表示されないため必ず保存する)

このシークレットアクセスキーは**絶対にGitにコミットしない**。誰かに漏れると、その人があなたのAWSアカウントを操作できてしまう。

## 5. AWS CLIをインストールする(Windows)

PowerShellで確認:

```powershell
aws --version
```

インストールされていなければ、公式インストーラを使う。

```powershell
winget install -e --id Amazon.AWSCLI
```

(wingetが使えない場合は [AWS公式のMSIインストーラ](https://awscli.amazonaws.com/AWSCLIV2.msi) を使う)

インストール後、新しいシェルで再度 `aws --version` を実行してバージョンが表示されることを確認する。

## 6. 認証情報を設定する(`aws configure`)

```powershell
aws configure
```

以下を順に入力する。

| 項目 | 入力する値 |
|---|---|
| AWS Access Key ID | 手順4で控えたアクセスキーID |
| AWS Secret Access Key | 手順4で控えたシークレットアクセスキー |
| Default region name | `ap-northeast-1`(東京リージョン) |
| Default output format | `json` |

設定内容は `~/.aws/credentials` と `~/.aws/config` に保存される(このファイルもGit管理下に置かないこと)。

確認:

```powershell
aws sts get-caller-identity
```

作成したIAMユーザーのARNが表示されればOK。

## 7. コストアラートを設定する(推奨)

学習用リソースを消し忘れて想定外の課金が発生するのを防ぐため、AWS Budgetsで予算アラートを設定しておく。

1. コンソールで「Billing and Cost Management」→「Budgets」→「Budgetを作成」
2. 「Cost budget」を選択し、月額の予算額(例: $20)を設定
3. しきい値(例: 実績が80%到達時)でメール通知を受け取るよう設定

コストの見積もりと後片付けの手順は [05-teardown-and-cost.md](05-teardown-and-cost.md) を参照。

---

ここまで完了したら、次は [02-terraform-setup.md](02-terraform-setup.md) でTerraform自体のセットアップに進む。
