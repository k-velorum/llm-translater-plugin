// 翻訳結果を表示するためのポップアップ要素
let translationPopup = null;

// 共通ユーティリティ関数
const DOMUtils = {
  // テキストノードを取得するTreeWalkerを作成
  createTextNodeWalker(rootNode) {
    return document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        if (!node.parentNode) return NodeFilter.FILTER_REJECT;
        const tag = node.parentNode.nodeName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
  },

  // TreeWalkerを使ってテキストノードを配列で取得
  getTextNodes(rootNode) {
    const walker = this.createTextNodeWalker(rootNode);
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      nodes.push(node);
    }
    return nodes;
  },

  // テキストノードの値のみを配列で取得
  getTextValues(rootNode) {
    return this.getTextNodes(rootNode).map(node => node.nodeValue);
  }
};

// エラー検出ユーティリティ
const ErrorUtils = {
  // 翻訳エラーかどうかを判定
  isTranslationError(text) {
    return text.includes('==== 翻訳エラー ====') || text.includes('翻訳エラー');
  }
};

// スタイル定義
const styles = {
  popup: {
    position: 'absolute',
    zIndex: '10000',
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    maxWidth: '400px',
    maxHeight: '300px',
    overflowY: 'auto',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    color: '#333'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px'
  },
  title: {
    fontWeight: 'bold'
  },
  closeBtn: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 5px',
    color: '#333'
  },
  content: {
    margin: '5px 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    padding: '8px',
    borderRadius: '4px'
  },
  normalContent: {
    color: '#000',
    backgroundColor: '#f8f8f8'
  },
  errorContent: {
    fontFamily: 'monospace',
    backgroundColor: '#fff0f0',
    color: '#d32f2f'
  },
  copyBtn: {
    padding: '5px 10px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    borderRadius: '3px',
    cursor: 'pointer',
    marginTop: '5px',
    color: '#333'
  },
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

// スタイルをエレメントに適用する関数
function applyStyles(element, styleObj) {
  Object.keys(styleObj).forEach(key => {
    element.style[key] = styleObj[key];
  });
}

// ポップアップを削除する関数
function removePopup() {
  if (translationPopup) {
    document.body.removeChild(translationPopup);
    translationPopup = null;
    document.removeEventListener('click', closePopupOnClickOutside);
  }
}

// バックグラウンドスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showTranslation') {
    showTranslationPopup(message.translatedText);
    // sendResponse を呼ばないので false (または undefined) を返す
    return false;
  } else if (message.action === 'getSelectedText') {
    // 選択されたテキストを取得してバックグラウンドスクリプトに返す
    const selectedText = window.getSelection().toString().trim();
    sendResponse({ selectedText: selectedText });
    // sendResponse を非同期で呼ぶ可能性があるので true を返す
    return true;
  } else if (message.action === 'getPageTexts') {
    // ページ内のテキストノードを取得してバックグラウンドに返す
    const texts = DOMUtils.getTextValues(document.body);
    sendResponse({ texts: texts });
    return true;
  } else if (message.action === 'applyPageTranslation') {
    // バックグラウンドから受け取った翻訳結果をページ内のテキストノードに適用
    const translations = message.translations;
    const textNodes = DOMUtils.getTextNodes(document.body);
    textNodes.forEach((node, index) => {
      if (translations[index] !== undefined) {
        node.nodeValue = translations[index];
      }
    });
    return;
  }
  // 他のメッセージタイプは処理しないので false を返す
  return false;
});

// 翻訳結果ポップアップの表示
function showTranslationPopup(translatedText) {
  // 既存のポップアップがあれば削除
  removePopup();

  // 選択範囲の位置を取得
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // ポップアップ要素の作成
  translationPopup = document.createElement('div');
  translationPopup.className = 'llm-translation-popup';
  applyStyles(translationPopup, styles.popup);
  translationPopup.style.left = `${window.scrollX + rect.left}px`;
  translationPopup.style.top = `${window.scrollY + rect.bottom + 10}px`;
  
  // ヘッダー部分
  const header = document.createElement('div');
  applyStyles(header, styles.header);
  
  const title = document.createElement('div');
  title.textContent = 'LLM翻訳結果';
  applyStyles(title, styles.title);
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  applyStyles(closeBtn, styles.closeBtn);
  closeBtn.onclick = removePopup;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // 翻訳テキスト部分
  const content = document.createElement('div');
  applyStyles(content, styles.content);
  
  // エラーメッセージかどうかをチェック
  const isError = ErrorUtils.isTranslationError(translatedText);
  
  if (isError) {
    applyStyles(content, styles.errorContent);
  } else {
    applyStyles(content, styles.normalContent);
  }
  
  content.textContent = translatedText;
  
  // コピーボタン
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'コピー';
  applyStyles(copyBtn, styles.copyBtn);
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
    removePopup();
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
    // ツイート本文と引用ツイートのテキスト要素を取得
    const tweetTextElements = tweetElement.querySelectorAll('[data-testid="tweetText"]');
    // 既に翻訳結果が表示されている場合は削除
    const anyExisting = Array.from(tweetTextElements).some(el => {
      const next = el.nextSibling;
      return next && next.classList && next.classList.contains('llm-tweet-translation');
    });
    if (anyExisting) {
      tweetTextElements.forEach(el => {
        const next = el.nextSibling;
        if (next && next.classList && next.classList.contains('llm-tweet-translation')) {
          next.remove();
        }
      });
      translateButton.style.color = 'rgb(83, 100, 113)';
      return;
    }
    // ローディング状態を表示
    translateButton.style.color = '#1DA1F2';
    translateIcon.style.display = 'none';
    spinner.style.display = 'block';
    // 翻訳リクエストを一括送信
    let pending = tweetTextElements.length;
    tweetTextElements.forEach(el => {
      const text = el.textContent;
      chrome.runtime.sendMessage(
        { action: 'translateTweet', text },
        (response) => {
          showTweetTranslation(tweetElement, el, response.error ? `翻訳エラー: ${response.error.message || '不明なエラー'}` : response.translatedText);
          pending -= 1;
          if (pending === 0) {
            translateButton.style.color = 'rgb(83, 100, 113)';
            translateIcon.style.display = 'block';
            spinner.style.display = 'none';
          }
        }
      );
    });
  });

  // アクションバーに翻訳ボタンを追加
  actionBar.appendChild(translateButton);
}

// ツイートの下に翻訳結果を表示する関数
function showTweetTranslation(tweetElement, tweetTextElement, translatedText) {
  // 既にこのツイートの翻訳結果が表示されている場合は削除
  const next = tweetTextElement.nextSibling;
  if (next && next.classList && next.classList.contains('llm-tweet-translation')) {
    next.remove();
  }

  // 翻訳結果の要素を作成
  const translationElement = document.createElement('div');
  translationElement.className = 'llm-tweet-translation';
  applyStyles(translationElement, styles.tweetTranslation);

  // エラーメッセージかどうかをチェック
  if (ErrorUtils.isTranslationError(translatedText)) {
    applyStyles(translationElement, styles.tweetTranslationError);
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