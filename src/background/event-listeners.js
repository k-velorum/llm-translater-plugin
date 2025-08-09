import { loadSettings, initializeDefaultSettings } from './settings.js';
import { translateText, translateBatchStructured, formatErrorDetails } from './api.js';

const PAGE_TRANSLATION_SEPARATOR = '[[[SEP]]]';
// 1バッチあたりの上限（Gemini向けに保守的）
const PAGE_TRANSLATION_MAX_CHARS = 3500;
const PAGE_TRANSLATION_MAX_ITEMS_PER_CHUNK = 50;
// セッションあたり1パスで処理するチャンク数（続行で再開）
const PAGE_TRANSLATION_CHUNKS_PER_PASS = 6;
// チャンク間のスロットリング（429回避のため）
const PAGE_TRANSLATION_DELAY_MS = 400;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function chunkByMaxCharsAndItems(items, maxChars, maxItems, sep) {
  const chunks = [];
  let current = [];
  let currentLen = 0;
  const sepLen = sep.length;
  for (const s of items) {
    const sLen = s.length;
    const projected = currentLen + (current.length ? sepLen : 0) + sLen;
    const wouldExceedChars = current.length > 0 && projected > maxChars;
    const wouldExceedItems = current.length >= maxItems;
    if (current.length > 0 && (wouldExceedChars || wouldExceedItems)) {
      chunks.push(current);
      current = [s];
      currentLen = sLen;
    } else {
      current.push(s);
      currentLen = projected;
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function translateJoinedOrSplit(chunk, settings, depth = 0) {
  // まず Gemini の場合は構造化バッチに挑戦（区切り不一致を根本回避）
  if (settings.apiProvider === 'gemini') {
    try {
      const arr = await translateBatchStructured(chunk, settings);
      if (Array.isArray(arr) && arr.length === chunk.length) return arr;
    } catch (e) {
      console.warn('構造化バッチ翻訳が失敗したため連結方式にフォールバックします:', e?.message || e);
    }
  }

  // まずは連結翻訳を試す
  const joined = chunk.join(PAGE_TRANSLATION_SEPARATOR);
  let translated = await translateText(joined, settings);
  let parts = translated.split(PAGE_TRANSLATION_SEPARATOR);
  if (parts.length === chunk.length) return parts;

  console.warn(`区切り数不一致のためサブ分割を試行: expected=${chunk.length} actual=${parts.length} depth=${depth}`);
  // 深さ制限 or 要素1なら個別翻訳
  if (depth >= 3 || chunk.length <= 1) {
    const perItem = [];
    for (const s of chunk) {
      try {
        const t = await translateText(s, settings);
        perItem.push(t);
        await sleep(PAGE_TRANSLATION_DELAY_MS);
      } catch (e) {
        console.error('個別翻訳フォールバック中のエラー:', e);
        perItem.push(s);
      }
    }
    return perItem;
  }
  // チャンクを2分割して再帰
  const mid = Math.floor(chunk.length / 2);
  const left = await translateJoinedOrSplit(chunk.slice(0, mid), settings, depth + 1);
  await sleep(PAGE_TRANSLATION_DELAY_MS);
  const right = await translateJoinedOrSplit(chunk.slice(mid), settings, depth + 1);
  return [...left, ...right];
}

// ページ翻訳セッション管理
const pageTranslationSessions = new Map(); // key: `${tabId}:${snapshotId}` -> session

function makeSessionKey(tabId, snapshotId) {
  return `${tabId}:${snapshotId}`;
}

function registerPageTranslationSession(session) {
  const key = makeSessionKey(session.tabId, session.snapshotId);
  pageTranslationSessions.set(key, session);
}

function getPageTranslationSession(tabId, snapshotId) {
  return pageTranslationSessions.get(makeSessionKey(tabId, snapshotId));
}

function deletePageTranslationSession(tabId, snapshotId) {
  pageTranslationSessions.delete(makeSessionKey(tabId, snapshotId));
}

async function processPageTranslationPass(session, chunksPerPass) {
  const { tabId, snapshotId, settings, chunks } = session;
  let processed = 0;
  while (!session.canceled && session.nextIndex < chunks.length && processed < chunksPerPass) {
    const chunk = chunks[session.nextIndex];
    const parts = await translateJoinedOrSplit(chunk, settings);
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'applyPageTranslationChunk',
        snapshotId,
        offset: session.offset,
        translations: parts
      });
    } catch (e) {
      console.warn('applyPageTranslationChunk 送信に失敗しました:', e);
    }
    session.offset += chunk.length;
    session.nextIndex += 1;
    processed += 1;
    await sleep(PAGE_TRANSLATION_DELAY_MS);
  }

  // 完了したらセッションを破棄
  if (!session.canceled && session.nextIndex >= chunks.length) {
    deletePageTranslationSession(tabId, snapshotId);
  }
}

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
    // 既存のメニューを全て削除 (Promiseでラップ)
    await new Promise((resolve) => {
      chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
          // 削除対象がなくても lastError が入る場合があるため、警告ではなくデバッグに留める
          console.debug(`コンテキストメニュー全削除時の情報: ${chrome.runtime.lastError.message}`);
        }
        resolve();
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
      let pageTexts = response.texts || [];
      const snapshotId = response.snapshotId;
      const settings = await loadSettings();

      // 長文になりすぎるのを避け、小チャンクに分けて逐次適用
      const chunks = chunkByMaxCharsAndItems(
        pageTexts,
        PAGE_TRANSLATION_MAX_CHARS,
        PAGE_TRANSLATION_MAX_ITEMS_PER_CHUNK,
        PAGE_TRANSLATION_SEPARATOR
      );

      const totalItems = pageTexts.length;
      const session = { tabId: tab.id, snapshotId, settings, chunks, nextIndex: 0, offset: 0, totalItems, canceled: false };
      registerPageTranslationSession(session);
      await processPageTranslationPass(session, PAGE_TRANSLATION_CHUNKS_PER_PASS);
      if (!session.canceled && session.nextIndex < session.chunks.length) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showPageTranslationControls',
          snapshotId,
          remainingChunks: session.chunks.length - session.nextIndex,
          processedItems: session.offset,
          totalItems: session.totalItems
        });
      } else {
        await chrome.tabs.sendMessage(tab.id, { action: 'hidePageTranslationControls', snapshotId });
      }
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

  // ページ翻訳: 続きを実行
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.action === 'continuePageTranslation') {
      (async () => {
        try {
          const tabId = sender?.tab?.id || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
          if (!tabId) return sendResponse && sendResponse({ ok: false, error: 'tab not found' });
          const { snapshotId } = message;
          const session = getPageTranslationSession(tabId, snapshotId);
          if (!session) return sendResponse && sendResponse({ ok: false, error: 'session not found' });
          await processPageTranslationPass(session, PAGE_TRANSLATION_CHUNKS_PER_PASS);
          if (!session.canceled && session.nextIndex < session.chunks.length) {
            await chrome.tabs.sendMessage(tabId, {
              action: 'showPageTranslationControls',
              snapshotId,
              remainingChunks: session.chunks.length - session.nextIndex,
              processedItems: session.offset,
              totalItems: session.totalItems
            });
          } else {
            await chrome.tabs.sendMessage(tabId, { action: 'hidePageTranslationControls', snapshotId });
          }
          sendResponse && sendResponse({ ok: true });
        } catch (e) {
          console.error('continuePageTranslation エラー:', e);
          sendResponse && sendResponse({ ok: false, error: e?.message || String(e) });
        }
      })();
      return true; // 非同期応答
    } else if (message && message.action === 'cancelPageTranslation') {
      (async () => {
        try {
          const tabId = sender?.tab?.id || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
          if (!tabId) return sendResponse && sendResponse({ ok: false, error: 'tab not found' });
          const { snapshotId } = message;
          const session = getPageTranslationSession(tabId, snapshotId);
          if (!session) {
            return sendResponse && sendResponse({ ok: true }); // すでに終わっている/存在しない
          }
          session.canceled = true;
          deletePageTranslationSession(tabId, snapshotId);
          await chrome.tabs.sendMessage(tabId, { action: 'hidePageTranslationControls', snapshotId });
          sendResponse && sendResponse({ ok: true });
        } catch (e) {
          console.error('cancelPageTranslation エラー:', e);
          sendResponse && sendResponse({ ok: false, error: e?.message || String(e) });
        }
      })();
      return true;
    }
    return false;
  });

  console.log('イベントリスナーが登録されました。');
}
