import { showTranslationPopup } from './translation-popup.js';
import { addTranslateButtonToTweets } from './twitter-integration.js';

// バックグラウンドスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showTranslation') {
    showTranslationPopup(message.translatedText);
  } else if (message.action === 'getSelectedText') {
    // 選択されたテキストを取得してバックグラウンドスクリプトに返す
    const selectedText = window.getSelection().toString().trim();
    sendResponse({ selectedText: selectedText });
  }
  
  // 非同期レスポンスを示すためにtrueを返す
  return true;
});

// ページ読み込み完了時に実行
document.addEventListener('DOMContentLoaded', () => {
  addTranslateButtonToTweets();
});

// すでにDOMが読み込まれている場合のために即時実行も行う
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  addTranslateButtonToTweets();
}