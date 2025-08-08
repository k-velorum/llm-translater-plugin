# LLM翻訳プラグイン

Google Chrome用の拡張機能で、選択したテキストをLLM（大規模言語モデル）を使用して翻訳します。OpenRouterまたはGoogle Gemini APIを利用して翻訳機能を提供します。

## 機能

- 任意のウェブページでテキストを選択し、右クリックメニューから「LLM翻訳」を選択すると翻訳されます
- 翻訳結果はポップアップで表示され、結果をコピーすることができます
- 複数のLLMプロバイダーをサポート：
  - OpenRouter API (GPT-3.5/4, Claude, Llamaなど複数のモデルにアクセス可能)
  - Google Gemini API
- モデル選択やAPIキーの設定が可能
- Twitter/X.comのツイート翻訳機能

## インストール方法

### 開発版として読み込む場合

1. このリポジトリをダウンロードまたはクローンします
2. アイコンを準備します：
   - 同梱の`create_icons.sh`スクリプトを実行して基本のSVGアイコンを作成します：
     ```bash
     chmod +x create_icons.sh
     ./create_icons.sh
     ```
   - 生成されたSVGから必要なPNGアイコンを作成します：
     ```bash
     # Inkscapeがインストールされている場合
     inkscape icons/icon.svg --export-filename=icons/icon16.png --export-width=16 --export-height=16
     inkscape icons/icon.svg --export-filename=icons/icon48.png --export-width=48 --export-height=48
     inkscape icons/icon.svg --export-filename=icons/icon128.png --export-width=128 --export-height=128
     
     # または、ImageMagickがインストールされている場合
     convert icons/icon.svg -resize 16x16 icons/icon16.png
     convert icons/icon.svg -resize 48x48 icons/icon48.png
     convert icons/icon.svg -resize 128x128 icons/icon128.png
     ```
   - または、`icons/README.md`を参照して、手動でアイコンを作成することもできます
   - 以下のファイルが必要です：
     - `icons/icon16.png`（16x16ピクセル）
     - `icons/icon48.png`（48x48ピクセル）
     - `icons/icon128.png`（128x128ピクセル）
3. Chromeを開き、`chrome://extensions/`にアクセスします
4. 右上の「デベロッパーモード」をオンにします
5. 「パッケージ化されていない拡張機能を読み込む」ボタンをクリックします
6. このリポジトリのディレクトリを選択します
7. 拡張機能が正常に読み込まれ、Chromeツールバーに表示されます

### Chrome Web Storeからインストール（将来的に公開予定）

1. Chrome Web Storeにアクセスします
2. 「LLM翻訳プラグイン」を検索します
3. 「Chromeに追加」ボタンをクリックします

## 使用方法

### 初期設定

1. Chromeツールバーの拡張機能アイコンをクリックして設定を開きます
2. 使用したいAPIプロバイダーを選択します（OpenRouterまたはGoogle Gemini）
3. APIキーを入力します：
   - OpenRouter API：[OpenRouter](https://openrouter.ai/)でアカウント作成後、APIキーを取得
   - Google Gemini API：[Google AI Studio](https://aistudio.google.com/)でAPIキーを取得
4. お好みのモデルを選択します
5. 「設定を保存」をクリックします

### 翻訳の使用

1. ウェブページ上で翻訳したいテキストを選択します
2. 選択したテキスト上で右クリックし、メニューから「LLM翻訳」を選択します
3. 翻訳結果がポップアップで表示されます
4. 必要に応じて「コピー」ボタンをクリックして結果をクリップボードにコピーできます

### Twitter/X.comでの翻訳

1. Twitter/X.comのツイートの下部に「LLM翻訳」ボタンが表示されます
2. ボタンをクリックすると、ツイートが翻訳されます
3. 翻訳結果はツイートの下に表示されます

## プライバシーとセキュリティ

- APIキーはお使いのブラウザのローカルストレージにのみ保存され、開発者には送信されません
- 選択したテキストは翻訳のためにのみAPIに送信され、他の目的では使用されません
- すべての通信はHTTPS経由で安全に行われます
- 中間サーバーはローカルで実行され、外部からアクセスできないようになっています

## 技術情報

- Manifest V3に準拠したChrome拡張機能
- OpenRouter API、Google Gemini APIに対応

## 中間サーバーの技術詳細

中間サーバーは以下の技術を使用しています：

- Node.js: サーバーサイドJavaScript実行環境
- Express: Webアプリケーションフレームワーク

中間サーバーは以下のエンドポイントを提供します：


- `/health`: サーバーのヘルスチェック

## 免責事項

- この拡張機能はデモンストレーション目的で作成されています
- 翻訳の品質はLLMの性能に依存します
- APIの使用に関連する費用はユーザー負担となります

## ライセンス

MITライセンス
