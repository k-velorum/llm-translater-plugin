// 翻訳結果を表示するためのポップアップ要素
let translationPopup = null;

// バックグラウンドスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showTranslation') {
    showTranslationPopup(message.translatedText);
  }
});

// 翻訳結果ポップアップの表示
function showTranslationPopup(translatedText) {
  // 既存のポップアップがあれば削除
  if (translationPopup) {
    document.body.removeChild(translationPopup);
    translationPopup = null;
  }

  // 選択範囲の位置を取得
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // ポップアップ要素の作成
  translationPopup = document.createElement('div');
  translationPopup.className = 'llm-translation-popup';
  translationPopup.style.position = 'absolute';
  translationPopup.style.left = `${window.scrollX + rect.left}px`;
  translationPopup.style.top = `${window.scrollY + rect.bottom + 10}px`;
  translationPopup.style.zIndex = '10000';
  translationPopup.style.backgroundColor = 'white';
  translationPopup.style.border = '1px solid #ccc';
  translationPopup.style.borderRadius = '5px';
  translationPopup.style.padding = '10px';
  translationPopup.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  translationPopup.style.maxWidth = '400px';
  translationPopup.style.maxHeight = '300px';
  translationPopup.style.overflowY = 'auto';
  translationPopup.style.fontSize = '14px';
  translationPopup.style.fontFamily = 'Arial, sans-serif';
  translationPopup.style.color = '#333'; // 全体のデフォルトテキスト色を設定
  
  // ヘッダー部分
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.marginBottom = '5px';
  
  const title = document.createElement('div');
  title.textContent = 'LLM翻訳結果';
  title.style.fontWeight = 'bold';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'none';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '16px';
  closeBtn.style.padding = '0 5px';
  closeBtn.style.color = '#333'; // 閉じるボタンの色を設定
  closeBtn.onclick = () => {
    document.body.removeChild(translationPopup);
    translationPopup = null;
  };
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // 翻訳テキスト部分
  const content = document.createElement('div');
  
  // エラーメッセージかどうかをチェック
  const isError = translatedText.includes('==== 翻訳エラー ====');
  
  if (isError) {
    content.style.fontFamily = 'monospace';
    content.style.backgroundColor = '#fff0f0';
    content.style.padding = '8px';
    content.style.borderRadius = '4px';
    content.style.color = '#d32f2f';
  } else {
    // 通常の翻訳テキストの場合のスタイル
    content.style.color = '#000'; // 黒色でテキストを表示
    content.style.backgroundColor = '#f8f8f8'; // 背景を薄いグレーに
    content.style.padding = '8px';
    content.style.borderRadius = '4px';
  }
  
  content.textContent = translatedText;
  content.style.margin = '5px 0';
  content.style.whiteSpace = 'pre-wrap';
  content.style.wordBreak = 'break-word';
  
  // コピーボタン
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'コピー';
  copyBtn.style.padding = '5px 10px';
  copyBtn.style.backgroundColor = '#f0f0f0';
  copyBtn.style.border = '1px solid #ccc';
  copyBtn.style.borderRadius = '3px';
  copyBtn.style.cursor = 'pointer';
  copyBtn.style.marginTop = '5px';
  copyBtn.style.color = '#333'; // コピーボタンのテキスト色
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(translatedText)
      .then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'コピーしました！';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('クリップボードへのコピーに失敗しました:', err);
      });
  };
  
  // 要素の追加
  translationPopup.appendChild(header);
  translationPopup.appendChild(content);
  translationPopup.appendChild(copyBtn);
  
  document.body.appendChild(translationPopup);
  
  // クリック以外の場所をクリックしたらポップアップを閉じる
  document.addEventListener('click', closePopupOnClickOutside);
}

// ポップアップ外のクリックでポップアップを閉じる
function closePopupOnClickOutside(event) {
  if (translationPopup && !translationPopup.contains(event.target)) {
    document.body.removeChild(translationPopup);
    translationPopup = null;
    document.removeEventListener('click', closePopupOnClickOutside);
  }
}

// Twitter（x.com）のツイート翻訳機能
// ツイートに翻訳ボタンを追加する関数
function addTranslateButtonToTweets() {
  // Twitterのドメインかどうかをチェック
  if (!window.location.hostname.includes('twitter.com') && !window.location.hostname.includes('x.com')) {
    return;
  }

  console.log('Twitter/X.comページを検出しました。翻訳ボタンを追加します。');

  // ツイート要素を見つけるためのセレクタ
  // 注意: Twitterのセレクタは変更される可能性があるため、定期的に確認が必要
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

// 個々のツイートに翻訳ボタンを追加する関数
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
  
  // スタイル要素を作成して追加
  const styleElement = document.createElement('style');
  styleElement.textContent = spinnerStyle;
  document.head.appendChild(styleElement);
  
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

// ツイートの下に翻訳結果を表示する関数
function showTweetTranslation(tweetElement, tweetTextElement, translatedText) {
  // 既に翻訳結果が表示されている場合は削除
  const existingTranslation = tweetElement.querySelector('.llm-tweet-translation');
  if (existingTranslation) {
    existingTranslation.remove();
  }

  // 翻訳結果の要素を作成
  const translationElement = document.createElement('div');
  translationElement.className = 'llm-tweet-translation';
  translationElement.style.marginTop = '8px';
  translationElement.style.padding = '8px 12px';
  translationElement.style.backgroundColor = '#46627e';
  translationElement.style.borderRadius = '8px';
  translationElement.style.fontSize = '14px';
  translationElement.style.color = '#FFF';
  translationElement.style.whiteSpace = 'pre-wrap';
  translationElement.style.wordBreak = 'break-word';
  translationElement.style.lineHeight = '1.4';

  // エラーメッセージかどうかをチェック
  if (translatedText.includes('翻訳エラー')) {
    translationElement.style.backgroundColor = '#fff0f0';
    translationElement.style.color = '#d32f2f';
  }

  translationElement.textContent = translatedText;

  // ツイートのテキスト要素の後に翻訳結果を挿入
  tweetTextElement.parentNode.insertBefore(translationElement, tweetTextElement.nextSibling);
}

// ページ読み込み完了時に実行
document.addEventListener('DOMContentLoaded', () => {
  addTranslateButtonToTweets();
});

// すでにDOMが読み込まれている場合のために即時実行も行う
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  addTranslateButtonToTweets();
}