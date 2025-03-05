import { loadSettings, formatErrorDetails } from './settings.js';
import { translateText } from './api.js';
import { setupMessageHandlers } from './message-handlers.js';

// 拡張機能の初期化
chrome.runtime.onInstalled.addListener(() => {
  // デフォルト設定の保存
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    chrome.storage.sync.set(settings);
  });
  
  // コンテキストメニューの作成
  chrome.contextMenus.create({
    id: 'translate-with-llm',
    title: 'LLM翻訳',
    contexts: ['selection']
  });
});

// コンテキストメニューのクリックイベント
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
        const errorDetails = formatErrorDetails(error, settings);
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showTranslation',
          translatedText: errorDetails
        });
      }
    } catch (tabError) {
      console.error('タブエラー:', tabError);
    }
  }
});

// キーボードショートカットのイベントハンドラ
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'translate-selection') {
    console.log('翻訳ショートカットが押されました');
    
    try {
      // アクティブなタブを取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        console.error('アクティブなタブが見つかりません');
        return;
      }
      
      // コンテンツスクリプトに選択テキストの取得を要求
      chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error('コンテンツスクリプトとの通信エラー:', chrome.runtime.lastError);
          return;
        }
        
        if (!response || !response.selectedText) {
          console.log('選択されたテキストがありません');
          return;
        }
        
        const selectedText = response.selectedText;
        console.log('選択テキスト:', selectedText);
        
        // 設定を読み込み
        const settings = await loadSettings();
        
        try {
          // テキストを翻訳
          const translatedText = await translateText(selectedText, settings);
          
          // 翻訳結果をコンテンツスクリプトに送信
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showTranslation',
            translatedText: translatedText
          });
        } catch (error) {
          console.error('翻訳エラー:', error);
          const errorDetails = formatErrorDetails(error, settings);
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showTranslation',
            translatedText: errorDetails
          });
        }
      });
    } catch (error) {
      console.error('ショートカット処理エラー:', error);
    }
  }
});

// メッセージハンドラの設定
setupMessageHandlers();

// DEFAULT_SETTINGSをインポートし忘れたので追加
import { DEFAULT_SETTINGS } from './settings.js';