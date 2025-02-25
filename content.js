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