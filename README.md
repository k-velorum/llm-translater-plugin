# LLM翻訳プラグイン

Google Chrome用の拡張機能で、選択したテキストをLLM（大規模言語モデル）を使用して翻訳します。OpenRouter、Google Gemini API、Ollama、LM Studioを利用して翻訳機能を提供します。

## 機能

- 任意のウェブページでテキストを選択し、右クリックメニューから「LLM翻訳」を選択すると翻訳されます
- 翻訳結果はポップアップで表示され、結果をコピーすることができます
- 複数のLLMプロバイダーをサポート：
  - OpenRouter API (GPT-4, Claude, Llamaなど複数のモデルにアクセス可能)
  - Google Gemini API
  - Ollama (ローカルLLM)
  - LM Studio (OpenAI互換ローカルサーバー)
- モデル選択やAPIキーの設定が可能
- Twitter/X.comのツイート翻訳機能
- YouTubeのコメント翻訳ボタン（機能タブでON/OFF可）
- ページ全体翻訳（コンテキストメニュー「LLMページ全体翻訳」から実行、進捗/続行UI付き）
- キーボードショートカットで翻訳（既定: Windows/Linux `Ctrl+Shift+T`, macOS `Cmd+Shift+T`）
- 機能タブからの詳細設定（Twitter/YouTubeの有効化、ページ翻訳のチャンク/ディレイ/区切りトークン）
- 翻訳用システムプロンプトの編集（機能タブ）
- テストタブで疎通確認（短文を使ってAPI設定をテスト）

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
2. 使用したいAPIプロバイダーを選択します（OpenRouter、Google Gemini、Ollama、LM Studio）
3. 選択したプロバイダーに応じて設定を行います：
   - **OpenRouter API**：[OpenRouter](https://openrouter.ai/)でアカウント作成後、APIキーを取得
   - **Google Gemini API**：[Google AI Studio](https://aistudio.google.com/)でAPIキーを取得
   - **Ollama**：[Ollama](https://ollama.ai/)をインストールし、ローカルサーバーを起動（デフォルト: http://localhost:11434）
   - **LM Studio**：[LM Studio](https://lmstudio.ai/)をインストールし、サーバーを起動（デフォルト: http://localhost:1234）
4. お好みのモデルを選択します
5. 「設定を保存」をクリックします

### 翻訳の使用

1. ウェブページ上で翻訳したいテキストを選択します
2. 選択したテキスト上で右クリックし、メニューから「LLM翻訳」を選択します
3. 翻訳結果がポップアップで表示されます
4. 必要に応じて「コピー」ボタンをクリックして結果をクリップボードにコピーできます

### ページ全体翻訳

1. ページ上で右クリックし、コンテキストメニューから「LLMページ全体翻訳」を選択します
2. 小チャンクに分割して順次翻訳・反映されます（進捗と「続きを実行」ボタン付き）
3. 詳細パラメータ（最大文字数/要素数/パス内チャンク数/遅延/区切りトークン）は機能タブで調整可能です

### Twitter/X.comでの翻訳

1. Twitter/X.comのツイートの下部に「LLM翻訳」ボタンが表示されます
2. ボタンをクリックすると、ツイートが翻訳されます
3. 翻訳結果はツイートの下に表示されます

### YouTubeでの翻訳

1. コメント本文の右側に「JP」アイコンの翻訳ボタンが表示されます（機能タブでON/OFF）
2. クリックすると直下に翻訳結果が表示されます（長文は自動で縦に伸長）

### キーボードショートカット

- 選択テキストを翻訳: `Ctrl+Shift+T`（macOSは `Cmd+Shift+T`）

### テストタブによる疎通確認

1. ポップアップの「テスト」タブを開きます
2. APIを選択し、短い英語文を入力して「APIをテスト」をクリック
3. 設定済みのプロバイダー/モデルで翻訳が実行され、結果が表示されます

## プライバシーとセキュリティ

- APIキーはお使いのブラウザのローカルストレージにのみ保存され、開発者には送信されません
- 選択したテキストは翻訳のためにのみAPIに送信され、他の目的では使用されません
- すべての通信はHTTPS経由で安全に行われます
- ローカルLLM（Ollama、LM Studio）を使用する場合、データは外部に送信されません

## 技術情報

- Manifest V3に準拠したChrome拡張機能
- OpenRouter API、Google Gemini API、Ollama、LM Studioに対応
- ES Modules対応のバックグラウンドスクリプト
- jQuery 3.7.1 + Select2 4.0.13を使用したUI

## 設定（機能タブ）

- プラットフォーム連携: Twitter(X)/YouTubeの翻訳ボタンの有効/無効
- ページ全体翻訳の詳細設定:
  - チャンク最大文字数 / チャンク最大要素数
  - 1パスあたりのチャンク数 / チャンク間ディレイ(ms)
  - 区切りトークン（高度な設定。既定は `[[[SEP]]]`）
- 翻訳システムプロンプトの編集:
  - すべての翻訳API呼び出しで使用されるsystemプロンプトを編集可能
  - 既定文面に戻すボタンあり

## トラブルシューティング

- Ollama（ローカル）で403が出る/CORSに起因する問題:
  - 環境変数 `OLLAMA_ORIGINS` を設定してサーバーを起動してください
  - 例（macOS/Linux）: `OLLAMA_ORIGINS=* ollama serve`
  - 例（Windows PowerShell）: `$env:OLLAMA_ORIGINS="*"; ollama serve`
  - 特定の拡張IDのみ許可する場合は `chrome-extension://<拡張ID>` を指定

## 免責事項

- この拡張機能はデモンストレーション目的で作成されています
- 翻訳の品質はLLMの性能に依存します
- APIの使用に関連する費用はユーザー負担となります

## ライセンス

MITライセンス
