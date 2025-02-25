// デフォルト設定
const DEFAULT_SETTINGS = {
  apiProvider: 'openrouter', // openrouter または gemini または anthropic
  openrouterApiKey: '',
  openrouterModel: 'openai/gpt-4o-mini', // 使用する正確なモデル名に合わせる
  geminiApiKey: '',
  geminiModel: 'gemini-flash-2.0',
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-haiku-20241022',
  proxyServerUrl: 'http://localhost:3000', // 中間サーバーのURL
  useProxyServer: false // デフォルトは中間サーバーを利用しない
};

// 設定の読み込み（必要な場合は利用）
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      resolve(settings);
    });
  });
}

// 拡張機能の初期化
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    chrome.storage.sync.set(settings);
  });
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
        const maskApiKey = (apiKey) => {
          if (!apiKey) return '未設定';
          if (apiKey.length <= 8) return '********';
          return apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
        };
        
        let apiProvider, modelName, maskedApiKey;
        
        if (settings.apiProvider === 'openrouter') {
          apiProvider = 'OpenRouter';
          modelName = settings.openrouterModel;
          maskedApiKey = maskApiKey(settings.openrouterApiKey);
        } else if (settings.apiProvider === 'gemini') {
          apiProvider = 'Google Gemini';
          modelName = settings.geminiModel;
          maskedApiKey = maskApiKey(settings.geminiApiKey);
        } else if (settings.apiProvider === 'anthropic') {
          apiProvider = 'Anthropic';
          modelName = settings.anthropicModel;
          maskedApiKey = maskApiKey(settings.anthropicApiKey);
        }
        
        const errorDetails = `
==== 翻訳エラー ====
API プロバイダー: ${apiProvider}
使用モデル: ${modelName}
APIキー: ${maskedApiKey}
エラー詳細: ${error.message || '詳細不明のエラー'}
${error.stack ? '\nスタックトレース:\n' + error.stack : ''}
==================
`;
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

// テキスト翻訳関数（実際の翻訳処理）
async function translateText(text, settings) {
  if (settings.apiProvider === 'openrouter') {
    return await translateWithOpenRouter(text, settings);
  } else if (settings.apiProvider === 'anthropic') {
    return await translateWithAnthropic(text, settings);
  } else {
    return await translateWithGemini(text, settings);
  }
}