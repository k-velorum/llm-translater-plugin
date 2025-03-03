/**
 * コンテンツスクリプト
 */
import { showTranslationPopup, removePopup } from './ui/popup.js';
import { initTwitterIntegration } from './ui/twitter-integration.js';

// バックグラウンドスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showTranslation') {
    showTranslationPopup(message.translatedText);
  }
});

// ページ読み込み完了時に実行
document.addEventListener('DOMContentLoaded', () => {
  initTwitterIntegration();
});

// すでにDOMが読み込まれている場合のために即時実行も行う
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initTwitterIntegration();
}

// エクスポート（他のモジュールから参照できるように）
export { removePopup };