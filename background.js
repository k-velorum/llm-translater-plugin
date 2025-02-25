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
}// OpenRouter APIでの翻訳（中間サーバー経由または直接アクセス）
async function translateWithOpenRouter(text, settings) {
  if (!settings.openrouterApiKey) {
    throw new Error('OpenRouter APIキーが設定されていません');
  }
  
  // 中間サーバーを利用するかどうかの設定に基づいて処理を分岐
  if (settings.useProxyServer) {
    // 中間サーバー経由でのリクエスト
    const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/openrouter`;
    console.log(`OpenRouter API リクエスト開始（中間サーバー経由）: ${proxyUrl}`);
    console.log(`使用モデル: ${settings.openrouterModel}`);
    
    try {
      const body = {
        apiKey: settings.openrouterApiKey,
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
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      console.log(`OpenRouter レスポンスステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
          console.error('OpenRouter エラーレスポンス:', errorData);
          throw new Error(`API Error: ${errorData.error?.message || response.statusText} (${response.status})`);
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
  } else {
    // 直接APIにアクセス
    console.log(`OpenRouter API リクエスト開始（直接アクセス）`);
    console.log(`使用モデル: ${settings.openrouterModel}`);
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openrouterApiKey}`,
          'HTTP-Referer': 'chrome-extension://llm-translator',
          'X-Title': 'LLM Translation Plugin'
        },
        body: JSON.stringify({
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
        })
      });
      
      console.log(`OpenRouter レスポンスステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
          console.error('OpenRouter エラーレスポンス:', errorData);
          throw new Error(`API Error: ${errorData.error?.message || response.statusText} (${response.status})`);
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
      
      // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
        
        // 一時的に中間サーバーを利用する設定に変更
        const tempSettings = { ...settings, useProxyServer: true };
        return await translateWithOpenRouter(text, tempSettings);
      }
      
      throw error;
    }
  }
}

// Gemini APIでの翻訳（直接アクセス - 変更なし）
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

// Anthropic APIでの翻訳（中間サーバー経由または直接アクセス）
async function translateWithAnthropic(text, settings) {
  if (!settings.anthropicApiKey) {
    throw new Error('Anthropic APIキーが設定されていません');
  }
  
  // 中間サーバーを利用するかどうかの設定に基づいて処理を分岐
  if (settings.useProxyServer) {
    // 中間サーバー経由でのリクエスト
    const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/anthropic`;
    console.log(`Anthropic API リクエスト開始（中間サーバー経由）: ${proxyUrl}`);
    console.log(`使用モデル: ${settings.anthropicModel}`);
    
    try {
      const body = {
        apiKey: settings.anthropicApiKey,
        model: settings.anthropicModel,
        system: '指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。',
        messages: [
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 1024
      };
      
      console.log('Anthropic リクエストボディ:', JSON.stringify(body, null, 2));
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      console.log(`Anthropic レスポンスステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
          console.error('Anthropic エラーレスポンス:', errorData);
          throw new Error(`API Error: ${errorData.error?.message || response.statusText} (${response.status})`);
        } catch (parseError) {
          try {
            errorText = await response.text();
            console.error('Anthropic エラーテキスト:', errorText);
          } catch (textError) {
            errorText = 'レスポンステキストを取得できませんでした';
          }
          throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
        }
      }
      
      const data = await response.json();
      console.log('Anthropic 成功レスポンス:', JSON.stringify(data, null, 2));
      return data.content[0].text.trim();
    } catch (error) {
      console.error('Anthropic API リクエスト中にエラーが発生:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('ネットワーク接続エラー: 中間サーバーに接続できません。サーバーが起動しているか確認してください。');
      }
      throw error;
    }
  } else {
    // 直接APIにアクセス
    console.log(`Anthropic API リクエスト開始（直接アクセス）`);
    console.log(`使用モデル: ${settings.anthropicModel}`);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: settings.anthropicModel,
          system: '指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。',
          messages: [
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 1024
        })
      });
      
      console.log(`Anthropic レスポンスステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
          console.error('Anthropic エラーレスポンス:', errorData);
          throw new Error(`API Error: ${errorData.error?.message || response.statusText} (${response.status})`);
        } catch (parseError) {
          try {
            errorText = await response.text();
            console.error('Anthropic エラーテキスト:', errorText);
          } catch (textError) {
            errorText = 'レスポンステキストを取得できませんでした';
          }
          throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
        }
      }
      
      const data = await response.json();
      console.log('Anthropic 成功レスポンス:', JSON.stringify(data, null, 2));
      return data.content[0].text.trim();
    } catch (error) {
      console.error('Anthropic API リクエスト中にエラーが発生:', error);
      
      // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
        
        // 一時的に中間サーバーを利用する設定に変更
        const tempSettings = { ...settings, useProxyServer: true };
        return await translateWithAnthropic(text, tempSettings);
      }
      
      throw error;
    }
  }
}// バックグラウンドでのメッセージ処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('バックグラウンドスクリプトがメッセージを受信:', message);
  
  // ツイート翻訳リクエストの処理
  if (message.action === 'translateTweet') {
    console.log('ツイート翻訳リクエストを受信:', message);
    loadSettings()
      .then(settings => translateText(message.text, settings))
      .then(translatedText => {
        console.log('ツイート翻訳成功:', translatedText);
        sendResponse({ translatedText: translatedText });
      })
      .catch(error => {
        console.error('ツイート翻訳エラー:', error);
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    return true; // 非同期レスポンスを示すためにtrueを返す
  }
  
  // テスト翻訳リクエストの処理
  if (message.action === 'testTranslate') {
    console.log('ポップアップからのテスト翻訳リクエストを受信:', message);
    translateText(message.text, message.settings)
      .then(result => {
        console.log('テスト翻訳成功:', result);
        sendResponse({ result: result });
      })
      .catch(error => {
        console.error('テスト翻訳エラー:', error);
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    return true;
  }
  
  // OpenRouter APIキー検証リクエストの処理
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
  
  // Anthropic APIキー検証リクエストの処理
  if (message.action === 'verifyAnthropicApiKey') {
    console.log('ポップアップからのAnthropic APIキー検証リクエストを受信');
    verifyAnthropicApiKey(message.apiKey)
      .then(result => {
        console.log('Anthropic APIキー検証成功:', result);
        sendResponse({ result: result });
      })
      .catch(error => {
        console.error('Anthropic APIキー検証エラー:', error);
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    return true;
  }
  
  // Anthropicモデル一覧リクエストの処理
  if (message.action === 'getAnthropicModels') {
    console.log('ポップアップからのAnthropicモデル一覧リクエストを受信');
    getAnthropicModels(message.apiKey)
      .then(models => {
        console.log('Anthropicモデル一覧取得成功:', models);
        sendResponse({ models: models });
      })
      .catch(error => {
        console.error('Anthropicモデル一覧取得エラー:', error);
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    return true;
  }
});
  
// AnthropicモデルリストをAPIから取得（中間サーバー経由または直接アクセス）
async function getAnthropicModels(apiKey) {
  if (!apiKey) {
    throw new Error('APIキーが指定されていません');
  }
  console.log('Anthropicモデル一覧を取得中...');
  
  // 設定を読み込み
  const settings = await loadSettings();
  
  // 中間サーバーを利用するかどうかの設定に基づいて処理を分岐
  if (settings.useProxyServer) {
    // 中間サーバー経由でのリクエスト
    const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/models/anthropic`;
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`モデル一覧の取得に失敗: ${errorData.error?.message || response.statusText} (${response.status})`);
      }
      
      const data = await response.json();
      console.log('Anthropic モデル一覧:', data);
      
      // 利用可能なモデルのみをフィルタリング
      const availableModels = data.models || [];
      return availableModels;
    } catch (error) {
      console.error('Anthropicモデル一覧取得中にエラーが発生:', error);
      throw error;
    }
  } else {
    // 直接APIにアクセス
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`モデル一覧の取得に失敗: ${errorData.error?.message || response.statusText} (${response.status})`);
      }
      
      const data = await response.json();
      console.log('Anthropic モデル一覧:', data);
      
      // 利用可能なモデルのみをフィルタリング
      const availableModels = data.models || [];
      return availableModels;
    } catch (error) {
      console.error('Anthropicモデル一覧取得中にエラーが発生:', error);
      
      // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
        
        // 一時的に中間サーバーを利用する設定に変更
        const tempSettings = { ...settings, useProxyServer: true };
        const proxyUrl = `${tempSettings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/models/anthropic`;
        
        try {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`モデル一覧の取得に失敗: ${errorData.error?.message || response.statusText} (${response.status})`);
          }
          
          const data = await response.json();
          console.log('Anthropic モデル一覧 (中間サーバー経由):', data);
          
          // 利用可能なモデルのみをフィルタリング
          const availableModels = data.models || [];
          return availableModels;
        } catch (proxyError) {
          console.error('中間サーバー経由でのモデル一覧取得中にエラーが発生:', proxyError);
          throw proxyError;
        }
      }
      
      throw error;
    }
  }
}

// OpenRouter APIキー検証（中間サーバー経由または直接アクセス）
async function verifyOpenRouterApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('APIキーが指定されていません');
  }
  console.log('OpenRouter APIキーを検証中...');
  
  // 設定を読み込み
  const settings = await loadSettings();
  
  // 中間サーバーを利用するかどうかの設定に基づいて処理を分岐
  if (settings.useProxyServer) {
    // 中間サーバー経由でのリクエスト
    const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/verify/openrouter`;
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });
      
      console.log(`OpenRouter APIキー検証 - レスポンスステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`APIキーが無効です: ${errorData.error?.message || response.statusText} (${response.status})`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OpenRouter APIキー検証中にエラーが発生:', error);
      throw error;
    }
  } else {
    // 直接APIにアクセス
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'chrome-extension://llm-translator',
          'X-Title': 'LLM Translation Plugin'
        }
      });
      
      console.log(`OpenRouter APIキー検証 - レスポンスステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`APIキーが無効です: ${errorData.error?.message || response.statusText} (${response.status})`);
      }
      
      return {
        isValid: true,
        message: 'APIキーは有効です',
        models: 'データ取得成功'
      };
    } catch (error) {
      console.error('OpenRouter APIキー検証中にエラーが発生:', error);
      
      // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
        
        // 一時的に中間サーバーを利用する設定に変更
        const tempSettings = { ...settings, useProxyServer: true };
        const proxyUrl = `${tempSettings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/verify/openrouter`;
        
        try {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey })
          });
          
          console.log(`OpenRouter APIキー検証 (中間サーバー経由) - レスポンスステータス: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`APIキーが無効です: ${errorData.error?.message || response.statusText} (${response.status})`);
          }
          
          const data = await response.json();
          return data;
        } catch (proxyError) {
          console.error('中間サーバー経由でのAPIキー検証中にエラーが発生:', proxyError);
          throw proxyError;
        }
      }
      
      throw error;
    }
  }
}

// Anthropic APIキー検証（中間サーバー経由または直接アクセス）
async function verifyAnthropicApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('APIキーが指定されていません');
  }
  console.log('Anthropic APIキーを検証中...');
  
  // 設定を読み込み
  const settings = await loadSettings();
  
  // 中間サーバーを利用するかどうかの設定に基づいて処理を分岐
  if (settings.useProxyServer) {
    // 中間サーバー経由でのリクエスト
    const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/verify/anthropic`;
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });
      
      console.log(`Anthropic APIキー検証 - レスポンスステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`APIキーが無効です: ${errorData.error?.message || response.statusText} (${response.status})`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Anthropic APIキー検証中にエラーが発生:', error);
      throw error;
    }
  } else {
    // 直接APIにアクセス
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
      
      console.log(`Anthropic APIキー検証 - レスポンスステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`APIキーが無効です: ${errorData.error?.message || response.statusText} (${response.status})`);
      }
      
      return {
        isValid: true,
        message: 'APIキーは有効です',
        models: 'データ取得成功'
      };
    } catch (error) {
      console.error('Anthropic APIキー検証中にエラーが発生:', error);
      
      // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
        
        // 一時的に中間サーバーを利用する設定に変更
        const tempSettings = { ...settings, useProxyServer: true };
        const proxyUrl = `${tempSettings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/verify/anthropic`;
        
        try {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey })
          });
          
          console.log(`Anthropic APIキー検証 (中間サーバー経由) - レスポンスステータス: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`APIキーが無効です: ${errorData.error?.message || response.statusText} (${response.status})`);
          }
          
          const data = await response.json();
          return data;
        } catch (proxyError) {
          console.error('中間サーバー経由でのAPIキー検証中にエラーが発生:', proxyError);
          throw proxyError;
        }
      }
      
      throw error;
    }
  }
}