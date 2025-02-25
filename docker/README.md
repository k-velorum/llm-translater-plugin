# LLM翻訳プラグイン中間サーバー

このサーバーは、LLM翻訳プラグインがCORS制約を回避してOpenRouterとAnthropicのAPIにアクセスするための中間サーバーです。

## 機能

- OpenRouter APIへのプロキシリクエスト
- Anthropic APIへのプロキシリクエスト
- APIキー検証
- Anthropicモデル一覧取得

## 必要条件

- Docker
- Docker Compose

## 使用方法

### サーバーの起動

```bash
# リポジトリのクローン
git clone <リポジトリURL>
cd <リポジトリ名>/docker

# Dockerコンテナのビルドと起動
docker-compose up -d
```

サーバーは http://localhost:3000 で実行されます。

### APIエンドポイント

#### OpenRouter API

```
POST /api/openrouter
```

リクエスト例:
```json
{
  "apiKey": "your-openrouter-api-key",
  "model": "openai/gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。"
    },
    {
      "role": "user",
      "content": "Hello, world!"
    }
  ]
}
```

#### Anthropic API

```
POST /api/anthropic
```

リクエスト例:
```json
{
  "apiKey": "your-anthropic-api-key",
  "model": "claude-3-5-haiku-20241022",
  "system": "指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。",
  "messages": [
    {
      "role": "user",
      "content": "Hello, world!"
    }
  ],
  "max_tokens": 1024
}
```

#### OpenRouter APIキー検証

```
POST /api/verify/openrouter
```

リクエスト例:
```json
{
  "apiKey": "your-openrouter-api-key"
}
```

#### Anthropic APIキー検証

```
POST /api/verify/anthropic
```

リクエスト例:
```json
{
  "apiKey": "your-anthropic-api-key"
}
```

#### Anthropicモデル一覧取得

```
POST /api/models/anthropic
```

リクエスト例:
```json
{
  "apiKey": "your-anthropic-api-key"
}
```

## 開発

### ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発モードでの起動
npm run dev
```

### ログ

ログは `logs` ディレクトリに保存されます。

- `combined.log`: すべてのログ
- `error.log`: エラーログのみ