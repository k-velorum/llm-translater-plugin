/**
 * コンテキストメニュー関連の機能
 */
import { translateText } from '../translation/translator.js';
import { loadSettings } from '../settings/settings.js';

/**
 * コンテキストメニューを初期化する
 */
function initContextMenu() {
  chrome.contextMenus.create({
    id: 'translate-with-llm',
    title: 'LLM翻訳',
    contexts: ['selection']
  });
}

/**
 * コンテキストメニューのクリックイベントを処理する
 * @param {Object} info - クリック情報
 * @param {Object} tab - タブ情報
 */
async function handleContextMenuClick(info, tab) {
  if (info.menuItemId === 'translate-with-llm' && info.selectionText) {
    const selectedText = info.selectionText;
    const settings = await loadSettings();
    
    try {
      await chrome.tabs.get(tab.id);
      try {
        const translatedText = await translateText(selectedText, settings);
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showTranslation',
          translatedText: translatedText
        });
      } catch (error) {
        console.error('翻訳エラー:', error);
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showTranslation',
          translatedText: `翻訳エラー: ${error.message}`
        });
      }
    } catch (tabError) {
      console.error('タブエラー:', tabError);
    }
  }
}

export { initContextMenu, handleContextMenuClick };