import { loadSettings, initializeDefaultSettings } from './settings.js';
import { translateText, formatErrorDetails } from './api.js';

const PAGE_TRANSLATION_SEPARATOR = '[[[SEP]]]';

async function translateAndNotify(tabId, text) {
  const settings = await loadSettings();
  try {
    const translatedText = await translateText(text, settings);
    await chrome.tabs.sendMessage(tabId, { action: 'showTranslation', translatedText });
  } catch (error) {
    console.error('翻訳エラー:', error);
    const errorDetails = formatErrorDetails(error, settings);
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'showTranslation', translatedText: errorDetails });
    } catch (sendMessageError) {
      console.error('エラーメッセージ送信失敗:', sendMessageError);
    }
  }
}

// コンテキストメニュー作成
async function setupContextMenu() {
  const menuId = 'translate-with-llm';
  try {
    // 既存のメニューを削除 (Promiseでラップ)
    await new Promise((resolve) => {
      chrome.contextMenus.remove(menuId, () => {
        // remove は ID が存在しない場合でも lastError を設定しないことがあるため、
        // ここでの lastError チェックは必須ではないかもしれないが、念のため行う
        if (chrome.runtime.lastError) {
          // エラーが発生しても、無視して次に進む（存在しないメニューを削除しようとした場合など）
          console.warn(`コンテキストメニュー削除時に警告: ${chrome.runtime.lastError.message}`);
        }
        resolve(); // 削除が試行されたら resolve
      });
    });

    // 新しいメニューを作成 (Promiseでラップ)
    await new Promise((resolve, reject) => {
        chrome.contextMenus.create({
          id: menuId,
          title: 'LLM翻訳',
          contexts: ['selection']
        }, () => {
            if (chrome.runtime.lastError) {
                // エラーメッセージを具体的に表示
                const errorMessage = chrome.runtime.lastError.message || '詳細不明のエラー';
                console.error('コンテキストメニュー作成エラー:', errorMessage);
                reject(new Error(errorMessage)); // Errorオブジェクトでrejectする
            } else {
                console.log('コンテキストメニューが作成されました。');
                resolve();
            }
        });
    });

    // ページ全体翻訳メニューを作成
    await new Promise((resolve, reject) => {
        chrome.contextMenus.create({
          id: 'translate-page',
          title: 'LLMページ全体翻訳',
          contexts: ['page']
        }, () => {
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || '詳細不明のエラー';
                console.error('ページ全体翻訳メニュー作成エラー:', errorMessage);
                reject(new Error(errorMessage));
            } else {
                console.log('ページ全体翻訳メニューが作成されました。');
                resolve();
            }
        });
    });

  } catch (error) {
    // create で reject された場合やその他の予期せぬエラー
    console.error('コンテキストメニュー設定中に予期せぬエラー:', error);
  }
}

// コンテキストメニュークリック時の処理
async function handleContextMenuClick(info, tab) {
  if (info.menuItemId === 'translate-page') {
    console.log('ページ全体翻訳リクエストを受信');
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageTexts' });
      const pageTexts = response.texts;
      const joinedText = pageTexts.join(PAGE_TRANSLATION_SEPARATOR);
      const settings = await loadSettings();
      const translatedJoined = await translateText(joinedText, settings);
      const translatedArray = translatedJoined.split(PAGE_TRANSLATION_SEPARATOR);
      await chrome.tabs.sendMessage(tab.id, { action: 'applyPageTranslation', translations: translatedArray });
    } catch (error) {
      console.error('ページ全体翻訳エラー:', error);
    }
    return;
  }
  if (info.menuItemId === 'translate-with-llm' && info.selectionText) {
    const selectedText = info.selectionText;
    console.log('コンテキストメニューから翻訳:', selectedText);
    try {
      // タブが存在するか確認し、メッセージを送信
      await chrome.tabs.get(tab.id); // tab.id が存在するか確認
      await translateAndNotify(tab.id, selectedText);
    } catch (tabError) {
      // タブが存在しない、またはアクセスできない場合のエラー
      console.error('タブへのアクセスエラー (コンテキストメニュー):', tabError);
      // ここでユーザーに通知する方法を検討 (例: バッジテキストの変更など)
    }
  }
}

// キーボードショートカット処理
async function handleCommand(command) {
  if (command === 'translate-selection') {
    console.log('翻訳ショートカットが押されました');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        console.error('アクティブなタブが見つからないか、IDがありません');
        return;
      }

      // コンテンツスクリプトにメッセージを送信し、応答を待つ
      // sendMessage は Promise を返さないため、コールバックまたは async/await でラップする必要がある
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve(response);
        });
      });


      if (!response || !response.selectedText) {
        console.log('選択されたテキストがありません (ショートカット)');
        // 必要であればユーザーに通知 (例: 短い通知を表示)
        // chrome.notifications.create(...) など
        return;
      }

      const selectedText = response.selectedText;
      console.log('選択テキスト (ショートカット):', selectedText);
      await translateAndNotify(tab.id, selectedText);
    } catch (error) {
       if (error.message && error.message.includes('Could not establish connection')) {
         console.warn('コンテンツスクリプトとの接続確立失敗 (ショートカット):', error.message);
         // ページがリロードされた直後などに発生しうる。ユーザーに再試行を促す通知などが考えられる。
       } else {
         console.error('ショートカット処理中に予期せぬエラー:', error);
       }
    }
  }
}


// イベントリスナーの登録
export function registerEventListeners() {
  // インストール/更新時の処理
  chrome.runtime.onInstalled.addListener((details) => {
    console.log(`拡張機能が ${details.reason} されました。`);
    initializeDefaultSettings(); // 設定の初期化/更新
    setupContextMenu(); // コンテキストメニューの設定
  });

  // コンテキストメニュークリック
  // 既にリスナーが登録されている場合、重複登録を避ける (ただし通常 onInstalled で十分)
  if (!chrome.contextMenus.onClicked.hasListener(handleContextMenuClick)) {
      chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
  }

  // キーボードショートカット
  if (!chrome.commands.onCommand.hasListener(handleCommand)) {
      chrome.commands.onCommand.addListener(handleCommand);
  }

  console.log('イベントリスナーが登録されました。');
}
