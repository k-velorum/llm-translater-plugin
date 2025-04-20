# LLM翻訳プラグイン Wiki

## 1. 概要

このプロジェクトは、Google Chrome用の拡張機能であり、ウェブページ上で選択したテキストやTwitter/X.comのツイートを、ユーザーが選択した大規模言語モデル（LLM）を使用して翻訳します。

**主な機能:**

*   **テキスト選択翻訳:** ウェブページ上の任意のテキストを選択し、右クリックメニューまたはキーボードショートカット (`Ctrl+Shift+T` / `Command+Shift+T`) で翻訳を実行できます。
*   **Twitter/X.com 翻訳:** Twitter/X.comのツイートの下部に表示される翻訳ボタンをクリックすることで、ツイート内容を翻訳します。
*   **ページ全体翻訳:** ページを右クリックして「LLMページ全体翻訳」を選ぶと、ページ内のテキストノードを収集し、一括で翻訳してページ上に置き換えて表示します。
*   **複数LLMプロバイダー対応:** OpenRouter API, Google Gemini API, Anthropic API のいずれかを選択して利用できます。
*   **モデル選択:** 各APIプロバイダーが提供するモデルの中から、好みのモデルを選択できます（OpenRouter, Gemini, Anthropicのいずれも、APIキーが設定されていれば動的にモデル一覧を取得）。
*   **設定画面:** 拡張機能のアイコンからアクセスできるポップアップ画面で、APIキー、使用モデル、中間サーバー設定などを構成できます。
*   **APIテスト機能:** 設定画面から、選択したAPIプロバイダーとの接続をテストできます。
*   **中間サーバー:** ブラウザのCORS制約を回避するため、OpenRouterおよびAnthropic APIへのリクエストをプロキシするローカルサーバー（Dockerで実行）を利用するオプションがあります。

## 2. アーキテクチャ

本拡張機能はChrome Manifest V3に基づいて構築されており、以下の主要コンポーネントで構成されています。

*   **`manifest.json`**: 拡張機能の基本的な設定ファイル。パーミッション、バックグラウンドスクリプト (`"type": "module"` を指定)、コンテンツスクリプト、ポップアップUI、アイコンなどを定義します。
*   **`background.js`**: バックグラウンドで動作するサービスワーカーのエントリーポイント。各バックグラウンドモジュールをインポートし、初期化処理（イベントリスナー登録など）を行います。
*   **`src/background/`**: バックグラウンド処理のコアロジックを格納するディレクトリ。
    *   **`api.js`**: LLM API (OpenRouter, Gemini, Anthropic) へのリクエスト送信、レスポンス処理、エラーフォーマットを担当します。中間サーバー経由と直接アクセスのロジックを含みます。
    *   **`message-handlers.js`**: `content.js` や `popup.js` からのメッセージ (`chrome.runtime.onMessage`) を受け取り、対応する処理（翻訳実行、APIテスト、キー検証、モデル取得など）を呼び出します。
    *   **`settings.js`**: 設定 (`chrome.storage.sync`) の読み込みとデフォルト設定の初期化を担当します。
    *   **`event-listeners.js`**: Chrome拡張機能のイベント (`onInstalled`, `contextMenus.onClicked`, `commands.onCommand`) のリスナー登録と、イベント発生時の処理を担当します。
*   **`content.js`**: ウェブページ上で動作するスクリプト。
    *   ユーザーがテキストを選択した際に、バックグラウンドスクリプトからの要求 (`getSelectedText`) に応じて選択テキストを送信。
    *   バックグラウンドスクリプトから受け取った翻訳結果 (`showTranslation`) をポップアップで表示。ポップアップにはコピーボタンも含まれる。
    *   Twitter/X.com のページを検出し、各ツイートに翻訳ボタンを動的に追加 (`MutationObserver` を使用)。
    *   ツイート翻訳ボタンがクリックされた際に、ツイートテキストをバックグラウンドスクリプトに送信し、返された翻訳結果をツイートの下に表示。
*   **`popup.html`**: 拡張機能アイコンクリック時に表示される設定画面のHTML構造。タブ（設定、テスト、詳細設定）、APIプロバイダー選択、APIキー入力欄、モデル選択ドロップダウン（Select2を使用）、テスト用テキストエリア、中間サーバー設定などが含まれる。
*   **`popup.js`**: 設定画面 (`popup.html`) の動作を制御するJavaScript。
    *   設定の読み込みと保存 (`chrome.storage.sync`)。
    *   APIプロバイダーの選択に応じて表示セクションを切り替え。
    *   OpenRouter, Gemini, Anthropic のモデル一覧をAPIから動的に取得し、Select2ドロップダウンに表示（GeminiとAnthropicはAPIキーが必須）。
    *   APIキー検証機能。
    *   APIテスト機能（指定したテキストを翻訳）。
    *   中間サーバー設定の管理と接続テスト。
    *   UIイベント（タブ切り替え、ボタンクリックなど）のハンドリング。
*   **`docker/`**: 中間サーバー関連のファイル。
    *   **`server.js`**: Node.jsとExpressで実装された中間サーバー。OpenRouterとAnthropic APIへのリクエストをプロキシし、CORS問題を回避する。APIキー検証やモデル一覧取得のエンドポイントも提供。
    *   **`Dockerfile`**: 中間サーバーのDockerイメージをビルドするための設定。
    *   **`docker-compose.yml`**: Docker Composeを使用して中間サーバーコンテナを簡単に起動するための設定。
*   **`lib/`**: 外部ライブラリ (jQuery, Select2)。
*   **`icons/`**: 拡張機能で使用されるアイコンファイル。

## 3. 主要スクリプト詳細

### 3.1. バックグラウンドスクリプト (`src/background/`)

バックグラウンド処理は、役割ごとに以下のモジュールに分割されています。エントリーポイントはルートディレクトリの `background.js` です。

#### 3.1.1. `background.js` (エントリーポイント)

*   サービスワーカーの起動時に最初に実行されます。
*   `src/background/` ディレクトリ内の各モジュール (`message-handlers.js`, `event-listeners.js`) をインポートします。
*   `registerEventListeners` を呼び出して、拡張機能のイベントリスナーを登録します。
*   `chrome.runtime.onMessage` リスナーを登録し、受信したメッセージを `handleBackgroundMessage` に渡して処理させます。

#### 3.1.2. `src/background/event-listeners.js`

*   Chrome拡張機能の主要なイベントリスナーを登録し、それぞれのハンドラ関数を定義します。
*   **`registerEventListeners`**: このモジュールのメイン関数。以下のリスナーを登録します。
    *   `chrome.runtime.onInstalled`: 拡張機能のインストール時または更新時に実行されます。`initializeDefaultSettings` (設定初期化) と `setupContextMenu` (コンテキストメニュー作成) を呼び出します。
    *   `chrome.contextMenus.onClicked`: コンテキストメニュー (`LLM翻訳`, `LLMページ全体翻訳`) がクリックされた際の処理 (`handleContextMenuClick`) を実行します。選択テキストまたはページ全体翻訳を識別し、それぞれの処理を行います。
    *   `chrome.commands.onCommand`: キーボードショートカット (`translate-selection`) が押された際の処理 (`handleCommand`) を実行します。アクティブタブの `content.js` から選択テキストを取得し、翻訳を実行して結果を `content.js` に送信します。
*   **`setupContextMenu`**: コンテキストメニューを作成します。選択テキスト用(`LLM翻訳`)とページ全体翻訳用(`LLMページ全体翻訳`)の2つを生成し、既存のメニューがあれば削除してから再作成します。
*   **`handleContextMenuClick`**: コンテキストメニュークリック時の非同期処理。`menuItemId`を判別し、選択テキスト翻訳またはページ全体翻訳の処理を実行します。
*   **`handleCommand`**: キーボードショートカット実行時の非同期処理。

#### 3.1.3. `src/background/message-handlers.js`

*   `content.js` や `popup.js` から `chrome.runtime.sendMessage` で送信されたメッセージを処理します。
*   **`handleBackgroundMessage`**: メインのメッセージハンドラ関数。メッセージの `action` プロパティに基づいて処理を分岐します。非同期処理を行う場合は `true` を返す必要があります。
    *   `translateTweet`: `content.js` からのツイート翻訳リクエスト。`loadSettings` で設定を読み込み、`translateText` を呼び出して翻訳を実行し、結果を返します。
    *   `testTranslate`: `popup.js` からのAPIテストリクエスト。現在の設定とテスト用の設定をマージし、`translateText` を呼び出して翻訳を実行し、結果を返します。
    *   `verify[Provider]ApiKey`: `popup.js` からのAPIキー検証リクエスト。`handleApiRequest` を呼び出して検証処理を行います。
    *   `get[Provider]Models`: `popup.js` からのモデル一覧取得リクエスト。`handleModelListRequest` を呼び出してモデル一覧を取得します。
*   **`handleApiRequest`, `handleProxyRequest`, `handleDirectRequest`, `handleModelListRequest`**: APIキー検証やモデル一覧取得のためのヘルパー関数。設定 (`useProxyServer`) に応じて中間サーバー経由または直接APIアクセスを使い分けます。

#### 3.1.4. `src/background/api.js`

*   LLM APIとの通信に関するコアロジックを実装します。
*   **`DEFAULT_SETTINGS`**: APIキーやモデル名などのデフォルト設定値をエクスポートします。
*   **`translateText`**: 翻訳処理のメイン関数。設定された `apiProvider` に基づいて、適切な翻訳関数 (`translateWithOpenRouter`, `translateWithGemini`, `translateWithAnthropic`) を呼び出します。
*   **`translateWith[Provider]`**: 各APIプロバイダー固有の翻訳処理。
    *   APIキーの存在チェック。
    *   APIリクエストに必要なパラメータ（プロンプト、モデル名など）を構築。
    *   `makeApiRequest` を呼び出してAPIリクエストを実行。
    *   中間サーバー利用が無効で直接アクセスが失敗した場合（CORSエラー等）、自動的に中間サーバー経由でのリクエストにフォールバックするロジックを含みます (OpenRouter, Anthropic)。
*   **`makeApiRequest`**: `fetch` APIを使用してAPIリクエストを実行する共通の非同期関数。レスポンスステータスを確認し、エラーレスポンスの場合は詳細なエラー情報を抽出して例外をスローします。
*   **`formatErrorDetails`**: APIエラー発生時に、ユーザーフレンドリーなエラーメッセージ（APIプロバイダー、モデル名、マスクされたAPIキー、エラー詳細を含む）を生成します。

#### 3.1.5. `src/background/settings.js`

*   拡張機能の設定管理を担当します。
*   **`loadSettings`**: `chrome.storage.sync` から設定を非同期に読み込みます。`DEFAULT_SETTINGS` を利用して、未設定の項目にはデフォルト値を適用します。
*   **`initializeDefaultSettings`**: 拡張機能のインストール/更新時に呼び出され、既存の設定を保持しつつ、未設定の項目にデフォルト値を設定します。

### 3.2. `content.js`

アクティブなウェブページに挿入され、DOM操作やユーザーインタラクションを担当します。

*   **メッセージリスナー (`chrome.runtime.onMessage`)**:
*   `showTranslation`: バックグラウンドから翻訳結果（またはエラーメッセージ）を受け取り、`showTranslationPopup` を呼び出して表示します。
*   `getSelectedText`: バックグラウンドからの要求に応じて、現在の選択テキスト (`window.getSelection()`) を取得して返します。
*   `getPageTexts`: ページ内のテキストノードを収集し、バックグラウンドスクリプトに返します。
*   `applyPageTranslation`: バックグラウンドから受け取った翻訳結果をページ内のテキストノードに適用します。
*   **翻訳ポップアップ (`showTranslationPopup`, `removePopup`, `closePopupOnClickOutside`)**:
    *   選択されたテキストの近くに翻訳結果を表示するDOM要素を作成・挿入します。
    *   ポップアップにはヘッダー（タイトル、閉じるボタン）、翻訳内容、コピーボタンが含まれます。
    *   エラーメッセージの場合はスタイルを変更します (`styles.errorContent`)。
    *   ポップアップ外をクリックすると自動的に閉じます。
*   **Twitter/X.com 連携 (`addTranslateButtonToTweets`, `addButtonToTweet`, `showTweetTranslation`)**:
    *   現在のURLが `twitter.com` または `x.com` かどうかを確認します。
    *   `MutationObserver` を使用して、ページに新しく追加されるツイート要素 (`article[data-testid="tweet"]`) を監視します。
    *   各ツイート要素のアクションバー (`[role="group"]`) に「JP」アイコンの翻訳ボタンを追加します。
    *   翻訳ボタンクリック時に、ツイートテキストを取得し、バックグラウンドに `translateTweet` メッセージを送信します。
    *   バックグラウンドから翻訳結果を受け取り、ツイートテキストの下に結果を表示するDOM要素 (`llm-tweet-translation`) を挿入します。
    *   翻訳中はボタンアイコンをスピナーに変更します。
    *   エラー発生時も結果表示エリアにエラーメッセージを表示します。
*   **スタイル適用 (`applyStyles`, `styles`)**: ポップアップやツイート翻訳結果の見た目を定義し、動的に適用します。

### 3.3. `popup.js`

拡張機能の設定ポップアップ (`popup.html`) のUIロジックを担当します。

*   **初期化 (`init`)**: ページ読み込み完了時に実行され、各種初期化関数を呼び出します。
*   **要素取得 (`getElements`)**: ポップアップ内の主要なDOM要素への参照を取得します。
*   **タブ制御 (`initTabs`)**: 「設定」「テスト」「詳細設定」タブの切り替えロジックを初期化します。
*   **APIプロバイダー切り替え (`setupApiProviderToggle`)**: APIプロバイダー選択ドロップダウンの変更に応じて、対応する設定セクション（OpenRouter, Gemini, Anthropic）の表示/非表示を切り替えます。
*   **設定管理 (`loadSettings`, `saveSettings`, `saveAdvancedSettings`)**:
    *   `loadSettings`: `chrome.storage.sync` から保存されている設定値を読み込み、フォーム要素に反映させます。
    *   `saveSettings`: 「設定」タブのフォーム要素から値を取得し、`chrome.storage.sync` に保存します。
    *   `saveAdvancedSettings`: 「詳細設定」タブのフォーム要素（中間サーバーURL、利用有無）を保存します。
*   **モデル選択 (Select2連携) (`initSelect2`, `loadModels`, `fetchModels`, `populateModelSelect`, `setDefaultModels`, `updateModelInfo`, `formatModelOption`)**:
    *   jQueryとSelect2ライブラリを使用して、OpenRouterとAnthropicのモデル選択ドロップダウンを初期化します。
    *   `loadModels`: 設定されたAPIキーを使用して、モデル一覧を取得します。OpenRouterはAPIキーなしでも公開モデル一覧を取得できますが、GeminiとAnthropicはAPIキーが必須です。`popup.js` はまず直接APIアクセス (`fetchModels`) を試み、CORSエラーなどで失敗した場合にバックグラウンドスクリプト経由 (`fetchModelsViaBackground`) での取得にフォールバックします（中間サーバー利用時も含む）。取得失敗時はデフォルトモデル (`setDefaultModels`) を使用します。
    *   `populateModelSelect`: 取得したモデル一覧でドロップダウンのオプションを動的に生成・更新します。各オプションにはモデルの詳細情報が `data-model` 属性として格納されます。
    *   `updateModelInfo`: モデルが選択された際に、モデル名、コンテキスト長、料金などの詳細情報をドロップダウンの下に表示します。
    *   `formatModelOption`: Select2のドロップダウン表示をカスタマイズします。
*   **APIキー検証 (`createVerificationUI`, `verifyApiKey`, `verifyApiKeyViaBackground`)**:
    *   各APIキー入力欄の隣に「APIキーを検証」ボタンとステータス表示欄を動的に作成します。
    *   検証ボタンクリック時に、入力されたAPIキーを使用して、バックグラウンド経由 (`verifyApiKeyViaBackground`) または直接APIアクセス (`verifyApiKey`) で実際にAPI（モデル一覧取得など）を呼び出し、キーの有効性を確認します。
    *   検証結果（成功/失敗/検証中）をステータス欄に表示します。
    *   検証成功時には、そのAPIキーで対象プロバイダー（OpenRouter, Gemini, Anthropic）のモデル一覧も再取得・更新します。
*   **APIテスト (`testApi`)**:
    *   「テスト」タブで選択されたAPIプロバイダー、モデル、入力テキストを使用して、バックグラウンドに `testTranslate` メッセージを送信し、翻訳を実行します。
    *   実行結果（翻訳テキストまたはエラーメッセージ）を結果表示エリアに表示します。
*   **中間サーバーテスト (`testProxyServer`)**:
    *   「詳細設定」タブの「中間サーバー接続テスト」ボタンクリック時に、入力されたURLの `/health` エンドポイントにリクエストを送信し、接続を確認します。
*   **ステータス表示 (`showStatus`)**: 保存完了、テスト結果、エラーメッセージなどをユーザーにフィードバックするための共通関数。

### 3.4. `docker/server.js` (中間サーバー)

Node.js と Express を使用して構築されたシンプルなプロキシサーバーです。主にブラウザのCORS制約を回避する目的で使用されます。

*   **Expressセットアップ**: Expressアプリケーションを初期化し、JSONパーサーとCORSミドルウェア（すべてのオリジンを許可）を設定します。
*   **エンドポイント**:
    *   `/health` (GET): サーバーの稼働状況を確認するためのヘルスチェックエンドポイント。`{ status: 'ok' }` を返します。
    *   `/api/openrouter` (POST): OpenRouter APIへのプロキシ。リクエストボディからAPIキー、モデル、メッセージを受け取り、OpenRouterの `/chat/completions` エンドポイントに転送します。
    *   `/api/anthropic` (POST): Anthropic APIへのプロキシ。リクエストボディからAPIキー、モデル、システムプロンプト、メッセージなどを受け取り、Anthropicの `/messages` エンドポイントに転送します。
    *   `/api/verify/openrouter` (POST): OpenRouter APIキーの検証用。リクエストボディからAPIキーを受け取り、OpenRouterの `/models` エンドポイントにリクエストして検証します。
    *   `/api/verify/anthropic` (POST): Anthropic APIキーの検証用。リクエストボディからAPIキーを受け取り、Anthropicの `/models` エンドポイントにリクエストして検証します。
    *   `/api/models/anthropic` (POST): Anthropicモデル一覧取得用。リクエストボディからAPIキーを受け取り、Anthropicの `/models` エンドポイントにリクエストして結果を返します。
*   **APIリクエスト**: `axios` ライブラリを使用して、実際のLLM APIエンドポイントへのリクエストを行います。適切なヘッダー（Authorization, x-api-key, anthropic-versionなど）を設定します。
*   **エラーハンドリング**: APIリクエスト中のエラーをキャッチし、適切なステータスコードとエラーメッセージをクライアント（拡張機能）に返します。
*   **サーバー起動**: 指定されたポート（デフォルトは3000）でHTTPサーバーを起動します。

## 4. インストールと設定

(README.mdの内容を参照)

## 5. 使用方法

(README.mdの内容を参照)

## 6. 技術スタック

*   **フロントエンド (Chrome拡張機能)**:
    *   HTML, CSS, JavaScript
    *   Chrome Extension API (Manifest V3)
    *   jQuery (DOM操作、Select2依存)
    *   Select2 (モデル選択ドロップダウン)
*   **中間サーバー (オプション)**:
    *   Node.js
    *   Express.js (Webフレームワーク)
    *   Axios (HTTPクライアント)
    *   Docker / Docker Compose (コンテナ化、実行環境)
*   **LLM API**:
    *   OpenRouter API
    *   Google Gemini API
    *   Anthropic API