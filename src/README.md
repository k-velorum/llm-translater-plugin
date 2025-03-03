# LLM翻訳プラグイン - リファクタリング版

このディレクトリには、LLM翻訳プラグインのリファクタリングされたコードが含まれています。

## リファクタリングの概要

元のコードベースを以下のように改善しました：

1. **モジュール化**
   - 機能ごとに分割された明確なモジュール構造
   - ES Modulesを使用した依存関係の明示的な管理

2. **APIクライアントの抽象化**
   - 共通の基底クラス `BaseApiClient` を作成
   - 各APIプロバイダー（OpenRouter、Gemini、Anthropic）向けの専用クライアントクラス
   - ファクトリーパターンを使用したクライアント生成

3. **コードの重複削減**
   - 共通のユーティリティ関数を抽出
   - エラー処理の統一
   - 設定管理の一元化

4. **UI関連コードの分離**
   - ポップアップ表示機能を独立したモジュールに
   - Twitter/X.com統合機能を専用モジュールに

## ディレクトリ構造

```
src/
├── api-clients/       # APIクライアント関連
│   ├── base-client.js       # 基底クライアントクラス
│   ├── openrouter-client.js # OpenRouter API用クライアント
│   ├── gemini-client.js     # Google Gemini API用クライアント
│   ├── anthropic-client.js  # Anthropic API用クライアント
│   └── client-factory.js    # クライアント生成ファクトリー
├── utils/             # ユーティリティ関数
│   └── api-utils.js         # API関連ユーティリティ
├── settings/          # 設定管理
│   └── settings.js          # 設定読み込み・保存機能
├── translation/       # 翻訳機能
│   └── translator.js        # 翻訳コア機能
├── context-menu/      # コンテキストメニュー
│   └── context-menu.js      # コンテキストメニュー機能
├── ui/                # UI関連
│   ├── popup.js             # 翻訳結果ポップアップ
│   └── twitter-integration.js # Twitter/X.com統合
├── background.js      # バックグラウンドスクリプト
├── content.js         # コンテンツスクリプト
└── manifest.json      # 拡張機能マニフェスト
```

## ビルド方法

リポジトリのルートディレクトリにある `build.sh` スクリプトを実行してください：

```bash
./build.sh
```

ビルドされた拡張機能は `dist` ディレクトリに出力されます。

## 拡張機能のインストール方法

1. Chromeを開き、`chrome://extensions/`にアクセスします
2. 右上の「デベロッパーモード」をオンにします
3. 「パッケージ化されていない拡張機能を読み込む」ボタンをクリックします
4. `dist` ディレクトリを選択します

## 今後の改善点

1. **テストの導入**
   - ユニットテストの追加
   - モック機能を使用したAPIテスト

2. **さらなるモジュール化**
   - WebPackやRollupなどのバンドラーの導入
   - より細かいコンポーネント分割

3. **型チェック**
   - TypeScriptへの移行または JSDocによる型アノテーションの追加