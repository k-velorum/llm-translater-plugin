/**
 * 翻訳結果ポップアップUI
 */

// 翻訳結果を表示するためのポップアップ要素
let translationPopup = null;

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
 * ポップアップを削除する関数
 */
function removePopup() {
  if (translationPopup) {
    document.body.removeChild(translationPopup);
    translationPopup = null;
    document.removeEventListener('click', closePopupOnClickOutside);
  }
}

/**
 * ポップアップ外のクリックでポップアップを閉じる
 * @param {Event} event - クリックイベント
 */
function closePopupOnClickOutside(event) {
  if (translationPopup && !translationPopup.contains(event.target)) {
    removePopup();
  }
}

/**
 * 翻訳結果ポップアップの表示
 * @param {string} translatedText - 翻訳されたテキスト
 */
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
  const isError = translatedText.includes('==== 翻訳エラー ====') || 
                  translatedText.includes('翻訳エラー:');
  
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

export { showTranslationPopup, removePopup };