// デフォルト設定
const DEFAULT_SETTINGS = {
  apiProvider: 'openrouter', // openrouter または gemini
  openrouterApiKey: '',
  openrouterModel: 'openai/gpt-4o-mini', // 使用する正確なモデル名に合わせる
  geminiApiKey: 'YOUR_API_KEY',
  geminiModel: 'gemini-flash-2.0'
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
        const apiProvider = settings.apiProvider === 'openrouter' ? 'OpenRouter' : 'Google Gemini';
        const modelName = settings.apiProvider === 'openrouter' ? settings.openrouterModel : settings.geminiModel;
        const maskedApiKey = settings.apiProvider === 'openrouter'
          ? maskApiKey(settings.openrouterApiKey)
          : maskApiKey(settings.geminiApiKey);
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

// テキスト翻訳関数
async function translateText(text, settings) {
  if (settings.apiProvider === 'openrouter') {
    return await translateWithOpenRouter(text, settings);
  } else {
    return await translateWithGemini(text, settings);
  }
}

// OpenRouter APIでの翻訳（fetchのみ）
async function translateWithOpenRouter(text, settings) {
  if (!settings.openrouterApiKey) {
    throw new Error('OpenRouter APIキーが設定されていません');
  }
  const apiUrl = 'https://api.openrouter.ai/api/v1/chat/completions';
  console.log(`OpenRouter API リクエスト開始: ${apiUrl}`);
  console.log(`使用モデル: ${settings.openrouterModel}`);
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openrouterApiKey}`,
      'X-Title': 'LLM Translation Plugin'
    };
    console.log('OpenRouter リクエストヘッダー:', JSON.stringify(headers, null, 2));
    const body = {
      model: settings.openrouterModel,
      messages: [
        {
          role: 'system',
          content: '指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。'
        },
        {
          role: 'user',
          content: text
        }
      ]
    };
    console.log('OpenRouter リクエストボディ:', JSON.stringify(body, null, 2));
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    console.log(`OpenRouter レスポンスステータス: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
        console.error('OpenRouter エラーレスポンス:', errorData);
        throw new Error(`API Error: ${errorData.error || response.statusText} (${response.status})`);
      } catch (parseError) {
        try {
          errorText = await response.text();
          console.error('OpenRouter エラーテキスト:', errorText);
        } catch (textError) {
          errorText = 'レスポンステキストを取得できませんでした';
        }
        throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
      }
    }
    const data = await response.json();
    console.log('OpenRouter 成功レスポンス:', JSON.stringify(data, null, 2));
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenRouter API リクエスト中にエラーが発生:', error);
    throw error;
  }
}

// Gemini APIでの翻訳（fetchのみ）
async function translateWithGemini(text, settings) {
  if (!settings.geminiApiKey) {
    throw new Error('Gemini APIキーが設定されていません');
  }
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent?key=${settings.geminiApiKey}`;
  console.log(`Gemini API リクエスト開始: ${apiUrl.replace(settings.geminiApiKey, '***API_KEY***')}`);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `以下の文章を日本語に翻訳してください。翻訳結果のみを出力してください。\n\n${text}`
              }
            ]
          }
        ],
        generationConfig: { temperature: 0.2 }
      })
    });
    console.log(`Gemini レスポンスステータス: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('Gemini エラーレスポンス:', errorData);
      throw new Error(`API Error: ${errorData.error || response.statusText} (${response.status})`);
    }
    const data = await response.json();
    console.log('Gemini 成功レスポンス:', JSON.stringify(data, null, 2));
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini API リクエスト中にエラーが発生:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('ネットワーク接続エラー: Gemini APIに接続できません。インターネット接続を確認してください。');
    }
    throw error;
  }
}

// バックグラウンドでのメッセージ処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('バックグラウンドスクリプトがメッセージを受信:', message);
  if (message.action === 'testOpenRouter') {
    console.log('ポップアップからのOpenRouterテストリクエストを受信:', message);
    testOpenRouter(message.text, message.apiKey, message.model)
      .then(result => {
        console.log('OpenRouterテスト成功:', result);
        sendResponse({ result: result });
      })
      .catch(error => {
        console.error('OpenRouterテストエラー:', error);
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    return true;
  }
  if (message.action === 'verifyOpenRouterApiKey') {
    console.log('ポップアップからのOpenRouter APIキー検証リクエストを受信');
    verifyOpenRouterApiKey(message.apiKey)
      .then(result => {
        console.log('OpenRouter APIキー検証成功:', result);
        sendResponse({ result: result });
      })
      .catch(error => {
        console.error('OpenRouter APIキー検証エラー:', error);
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    return true;
  }
});

// OpenRouter APIキー検証（fetchのみ）
async function verifyOpenRouterApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('APIキーが指定されていません');
  }
  console.log('OpenRouter APIキーを検証中...');
  const apiUrl = 'https://api.openrouter.ai/api/v1/models';
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'LLM Translation Plugin'
      }
    });
    console.log(`OpenRouter APIキー検証 - レスポンスステータス: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`APIキーが無効です: ${errorData.error || response.statusText} (${response.status})`);
    }
    const data = await response.json();
    return {
      isValid: true,
      message: 'APIキーは有効です',
      models: data.data ? data.data.length : 'データ形式が不明'
    };
  } catch (error) {
    console.error('OpenRouter APIキー検証中にfetchエラーが発生:', error);
    throw error;
  }
}

// OpenRouter APIテスト（fetchのみ）
async function testOpenRouter(text, apiKey, model) {
  if (!apiKey) {
    throw new Error('OpenRouter APIキーが設定されていません');
  }
  const apiUrl = 'https://api.openrouter.ai/api/v1/chat/completions';
  console.log(`OpenRouter APIテスト開始: ${apiUrl}`);
  console.log(`使用モデル: ${model}`);
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Title': 'LLM Translation Plugin'
    };
    console.log('OpenRouterテスト - ヘッダー:', JSON.stringify(headers, null, 2));
    const body = {
      model: model,
      messages: [
        {
          role: 'system',
          content: '指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。'
        },
        {
          role: 'user',
          content: text
        }
      ]
    };
    console.log('OpenRouterテスト - リクエストボディ:', JSON.stringify(body, null, 2));
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    console.log(`OpenRouterテスト - レスポンスステータス: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
        console.error('OpenRouterテスト - エラーレスポンス:', errorData);
        throw new Error(`API Error: ${errorData.error || response.statusText} (${response.status})`);
      } catch (parseError) {
        try {
          errorText = await response.text();
          console.error('OpenRouterテスト - エラーテキスト:', errorText);
        } catch (textError) {
          errorText = 'レスポンステキストを取得できませんでした';
        }
        throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
      }
    }
    const data = await response.json();
    console.log('OpenRouterテスト - 成功レスポンス:', JSON.stringify(data, null, 2));
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenRouterテスト中にエラーが発生:', error);
    throw error;
  }
}
