/**
 * Twitter/X.com統合モジュール
 */

// スタイル定義
const styles = {
  tweetTranslation: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#46627e',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#FFF',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.4'
  },
  tweetTranslationError: {
    backgroundColor: '#fff0f0',
    color: '#d32f2f'
  }
};

/**
 * スタイルをエレメントに適用する関数
 * @param {HTMLElement} element - スタイルを適用する要素
 * @param {Object} styleObj - スタイルオブジェクト
 */
function applyStyles(element, styleObj) {
  Object.keys(styleObj).forEach(key => {
    element.style[key] = styleObj[key];
  });
}

/**
 * Twitter/X.com統合を初期化する
 */
function initTwitterIntegration() {
  // Twitterのドメインかどうかをチェック
  if (!window.location.hostname.includes('twitter.com') && !window.location.hostname.includes('x.com')) {
    return;
  }

  console.log('Twitter/X.comページを検出しました。翻訳ボタンを追加します。');

  // ツイート要素を見つけるためのセレクタ
  const tweetSelector = 'article[data-testid="tweet"]';

  // 既存のツイートに翻訳ボタンを追加
  document.querySelectorAll(tweetSelector).forEach(addButtonToTweet);

  // MutationObserverを使用して新しく追加されるツイートを監視
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          // 追加されたノードがエレメントの場合
          if (node.nodeType === Node.ELEMENT_NODE) {
            // ノード自体がツイートかチェック
            if (node.matches && node.matches(tweetSelector)) {
              addButtonToTweet(node);
            }
            // ノードの子要素にツイートがあるかチェック
            const tweets = node.querySelectorAll(tweetSelector);
            tweets.forEach(addButtonToTweet);
          }
        });
      }
    });
  });

  // body全体を監視
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('ツイート監視を開始しました');
}

/**
 * 個々のツイートに翻訳ボタンを追加する関数
 * @param {HTMLElement} tweetElement - ツイート要素
 */
function addButtonToTweet(tweetElement) {
  // 既にボタンが追加されているかチェック
  if (tweetElement.querySelector('.llm-translate-button')) {
    return;
  }

  // ツイートのテキスト部分を取得
  const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
  if (!tweetTextElement) {
    return; // テキストがないツイート（画像のみなど）はスキップ
  }

  // ツイートのアクションバーを取得（リツイート、いいねなどのボタンがある部分）
  const actionBar = tweetElement.querySelector('[role="group"]');
  if (!actionBar) {
    return;
  }

  // スピナーのスタイルを定義
  const spinnerStyle = `
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spinner {
      animation: rotate 1.5s linear infinite;
      display: none;
    }
  `;
  
  // スタイル要素を作成して追加（まだ追加されていない場合のみ）
  if (!document.querySelector('#llm-translator-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'llm-translator-styles';
    styleElement.textContent = spinnerStyle;
    document.head.appendChild(styleElement);
  }

  // 翻訳ボタンを作成
  const translateButton = document.createElement('div');
  translateButton.className = 'llm-translate-button';
  translateButton.style.display = 'flex';
  translateButton.style.alignItems = 'center';
  translateButton.style.cursor = 'pointer';
  translateButton.style.color = 'rgb(83, 100, 113)';
  translateButton.style.padding = '0 12px';
  translateButton.style.fontSize = '13px';
  translateButton.setAttribute('role', 'button');
  translateButton.setAttribute('aria-label', '日本語翻訳');
  
  // 通常アイコン（「あ」の文字を使用した独自デザイン）とローディングスピナーを含むHTML
  translateButton.innerHTML = `
    <div style="display: flex; align-items: center;">
      <svg class="translate-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M 3,6 A 5,5 0 0 1 8,1 L 16,1 A 5,5 0 0 1 21,6 L 21,14 A 5,5 0 0 1 16,19 L 14,19 L 12,23 L 10,19 L 8,19 A 5,5 0 0 1 3,14 Z" fill="#f8f8f8" stroke="#555" stroke-width="1"/>
        <text x="12" y="13.5" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="#555">JP</text>
      </svg>
      <svg class="spinner" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
      </svg>
    </div>
  `;

  // 翻訳アイコンとスピナーの要素を取得
  const translateIcon = translateButton.querySelector('.translate-icon');
  const spinner = translateButton.querySelector('.spinner');

  // 翻訳ボタンのクリックイベント
  translateButton.addEventListener('click', () => {
    // ツイートのテキストを取得
    const tweetText = tweetTextElement.textContent;

    // 既に翻訳結果が表示されている場合は削除
    const existingTranslation = tweetElement.querySelector('.llm-tweet-translation');
    if (existingTranslation) {
      existingTranslation.remove();
      translateButton.style.color = 'rgb(83, 100, 113)';
      return;
    }

    // ローディング状態を表示
    translateButton.style.color = '#1DA1F2';
    translateIcon.style.display = 'none';
    spinner.style.display = 'block';

    // バックグラウンドスクリプトに翻訳リクエストを送信
    chrome.runtime.sendMessage(
      {
        action: 'translateTweet',
        text: tweetText
      },
      (response) => {
        // ボタンの状態を元に戻す
        translateButton.style.color = 'rgb(83, 100, 113)';
        translateIcon.style.display = 'block';
        spinner.style.display = 'none';

        if (chrome.runtime.lastError) {
          console.error('翻訳リクエストエラー:', chrome.runtime.lastError);
          showTweetTranslation(tweetElement, tweetTextElement, `翻訳エラー: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (response.error) {
          console.error('翻訳エラー:', response.error);
          showTweetTranslation(tweetElement, tweetTextElement, `翻訳エラー: ${response.error.message || '不明なエラー'}`);
          return;
        }

        // 翻訳結果を表示
        showTweetTranslation(tweetElement, tweetTextElement, response.translatedText);
      }
    );
  });

  // アクションバーに翻訳ボタンを追加
  actionBar.appendChild(translateButton);
}

/**
 * ツイートの下に翻訳結果を表示する関数
 * @param {HTMLElement} tweetElement - ツイート要素
 * @param {HTMLElement} tweetTextElement - ツイートのテキスト要素
 * @param {string} translatedText - 翻訳されたテキスト
 */
function showTweetTranslation(tweetElement, tweetTextElement, translatedText) {
  // 既に翻訳結果が表示されている場合は削除
  const existingTranslation = tweetElement.querySelector('.llm-tweet-translation');
  if (existingTranslation) {
    existingTranslation.remove();
  }

  // 翻訳結果の要素を作成
  const translationElement = document.createElement('div');
  translationElement.className = 'llm-tweet-translation';
  applyStyles(translationElement, styles.tweetTranslation);

  // エラーメッセージかどうかをチェック
  if (translatedText.includes('翻訳エラー')) {
    applyStyles(translationElement, styles.tweetTranslationError);
  }

  translationElement.textContent = translatedText;

  // ツイートのテキスト要素の後に翻訳結果を挿入
  tweetTextElement.parentNode.insertBefore(translationElement, tweetTextElement.nextSibling);
}

export { initTwitterIntegration };