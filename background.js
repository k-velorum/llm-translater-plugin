// デフォルト設定
const DEFAULT_SETTINGS = {
  apiProvider: 'openrouter',
  openrouterApiKey: '',
  openrouterModel: 'openai/gpt-4o-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-flash-2.0',
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-haiku-20241022',
  proxyServerUrl: 'http://localhost:3000',
  useProxyServer: false
};

// 設定の読み込み
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

// エラー詳細のフォーマット
function formatErrorDetails(error, settings) {
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
  
  return `
==== 翻訳エラー ====
API プロバイダー: ${apiProvider}
使用モデル: ${modelName}
APIキー: ${maskedApiKey}
エラー詳細: ${error.message || '詳細不明のエラー'}
${error.stack ? '\nスタックトレース:\n' + error.stack : ''}
==================
`;
}

// テキスト翻訳関数
async function translateText(text, settings) {
  if (settings.apiProvider === 'openrouter') {
    return await translateWithOpenRouter(text, settings);
  } else if (settings.apiProvider === 'anthropic') {
    return await translateWithAnthropic(text, settings);
  } else {
    return await translateWithGemini(text, settings);
  }
}

// APIリクエスト共通処理
async function makeApiRequest(url, options, errorMessage) {
  try {
    const response = await fetch(url, options);
    console.log(`レスポンスステータス: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
        console.error('エラーレスポンス:', errorData);
        throw new Error(`API Error: ${errorData.error?.message || response.statusText} (${response.status})`);
      } catch (parseError) {
        try {
          errorText = await response.text();
          console.error('エラーテキスト:', errorText);
        } catch (textError) {
          errorText = 'レスポンステキストを取得できませんでした';
        }
        throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('成功レスポンス:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw error;
  }
}

// OpenRouter APIでの翻訳
async function translateWithOpenRouter(text, settings) {
  if (!settings.openrouterApiKey) {
    throw new Error('OpenRouter APIキーが設定されていません');
  }
  
  const messages = [
    {
      role: 'system',
      content: '指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。'
    },
    {
      role: 'user',
      content: text
    }
  ];
  
  if (settings.useProxyServer) {
    // 中間サーバー経由でのリクエスト
    const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/openrouter`;
    console.log(`OpenRouter API リクエスト開始（中間サーバー経由）: ${proxyUrl}`);
    console.log(`使用モデル: ${settings.openrouterModel}`);
    
    const body = {
      apiKey: settings.openrouterApiKey,
      model: settings.openrouterModel,
      messages: messages
    };
    
    console.log('OpenRouter リクエストボディ:', JSON.stringify(body, null, 2));
    
    const data = await makeApiRequest(
      proxyUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      },
      'OpenRouter API リクエスト中にエラーが発生'
    );
    
    return data.choices[0].message.content.trim();
  } else {
    // 直接APIにアクセス
    console.log(`OpenRouter API リクエスト開始（直接アクセス）`);
    console.log(`使用モデル: ${settings.openrouterModel}`);
    
    try {
      const data = await makeApiRequest(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openrouterApiKey}`,
            'HTTP-Referer': 'chrome-extension://llm-translator',
            'X-Title': 'LLM Translation Plugin'
          },
          body: JSON.stringify({
            model: settings.openrouterModel,
            messages: messages
          })
        },
        'OpenRouter API リクエスト中にエラーが発生'
      );
      
      return data.choices[0].message.content.trim();
    } catch (error) {
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

// Gemini APIでの翻訳
async function translateWithGemini(text, settings) {
  if (!settings.geminiApiKey) {
    throw new Error('Gemini APIキーが設定されていません');
  }
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent?key=${settings.geminiApiKey}`;
  console.log(`Gemini API リクエスト開始: ${apiUrl.replace(settings.geminiApiKey, '***API_KEY***')}`);
  
  try {
    const data = await makeApiRequest(
      apiUrl,
      {
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
      },
      'Gemini API リクエスト中にエラーが発生'
    );
    
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('ネットワーク接続エラー: Gemini APIに接続できません。インターネット接続を確認してください。');
    }
    throw error;
  }
}

// Anthropic APIでの翻訳
async function translateWithAnthropic(text, settings) {
  if (!settings.anthropicApiKey) {
    throw new Error('Anthropic APIキーが設定されていません');
  }
  
  const systemPrompt = '指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。';
  const messages = [
    {
      role: 'user',
      content: text
    }
  ];
  
  if (settings.useProxyServer) {
    // 中間サーバー経由でのリクエスト
    const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/anthropic`;
    console.log(`Anthropic API リクエスト開始（中間サーバー経由）: ${proxyUrl}`);
    console.log(`使用モデル: ${settings.anthropicModel}`);
    
    const body = {
      apiKey: settings.anthropicApiKey,
      model: settings.anthropicModel,
      system: systemPrompt,
      messages: messages,
      max_tokens: 1024
    };
    
    console.log('Anthropic リクエストボディ:', JSON.stringify(body, null, 2));
    
    const data = await makeApiRequest(
      proxyUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      },
      'Anthropic API リクエスト中にエラーが発生'
    );
    
    return data.content[0].text.trim();
  } else {
    // 直接APIにアクセス
    console.log(`Anthropic API リクエスト開始（直接アクセス）`);
    console.log(`使用モデル: ${settings.anthropicModel}`);
    
    try {
      const data = await makeApiRequest(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: settings.anthropicModel,
            system: systemPrompt,
            messages: messages,
            max_tokens: 1024
          })
        },
        'Anthropic API リクエスト中にエラーが発生'
      );
      
      return data.content[0].text.trim();
    } catch (error) {
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
}

// バックグラウンドでのメッセージ処理
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
  
  // APIキー検証とモデル一覧取得の共通処理
  function handleApiRequest(action, apiKey, endpoint, headers, successCallback) {
    console.log(`ポップアップからの${action}リクエストを受信`);
    
    // 設定を読み込み
    loadSettings()
      .then(settings => {
        // 中間サーバーを利用するかどうかの設定に基づいて処理を分岐
        if (settings.useProxyServer) {
          return handleProxyRequest(action, apiKey, settings.proxyServerUrl);
        } else {
          return handleDirectRequest(endpoint, headers);
        }
      })
      .then(result => {
        console.log(`${action}成功:`, result);
        successCallback(result);
      })
      .catch(error => {
        console.error(`${action}エラー:`, error);
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    
    return true;
  }
  
  // 中間サーバー経由でのリクエスト処理
  function handleProxyRequest(action, apiKey, proxyServerUrl) {
    const proxyUrl = `${proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/${action.toLowerCase()}`;
    
    return makeApiRequest(
      proxyUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      },
      `${action}中にエラーが発生`
    );
  }
  
  // 直接APIにアクセスする処理
  function handleDirectRequest(endpoint, headers) {
    return makeApiRequest(
      endpoint,
      {
        method: 'GET',
        headers: headers
      },
      'API直接アクセス中にエラーが発生'
    );
  }
  
  // OpenRouter APIキー検証リクエストの処理
  if (message.action === 'verifyOpenRouterApiKey') {
    handleApiRequest(
      'OpenRouter APIキー検証',
      message.apiKey,
      'https://openrouter.ai/api/v1/models',
      {
        'Authorization': `Bearer ${message.apiKey}`,
        'HTTP-Referer': 'chrome-extension://llm-translator',
        'X-Title': 'LLM Translation Plugin'
      },
      (result) => {
        sendResponse({
          result: {
            isValid: true,
            message: 'APIキーは有効です',
            models: 'データ取得成功'
          }
        });
      }
    );
    return true;
  }
  
  // Anthropic APIキー検証リクエストの処理
  if (message.action === 'verifyAnthropicApiKey') {
    handleApiRequest(
      'Anthropic APIキー検証',
      message.apiKey,
      'https://api.anthropic.com/v1/models',
      {
        'x-api-key': message.apiKey,
        'anthropic-version': '2023-06-01'
      },
      (result) => {
        sendResponse({
          result: {
            isValid: true,
            message: 'APIキーは有効です',
            models: 'データ取得成功'
          }
        });
      }
    );
    return true;
  }
  
  // モデル一覧取得の共通処理
  function handleModelListRequest(provider, apiKey, endpoint, headers, dataProcessor) {
    console.log(`ポップアップからの${provider}モデル一覧リクエストを受信`);
    
    // 設定を読み込み
    loadSettings()
      .then(settings => {
        if (settings.useProxyServer) {
          // 中間サーバー経由でのリクエスト
          const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/models/${provider.toLowerCase()}`;
          
          return makeApiRequest(
            proxyUrl,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey })
            },
            `${provider}モデル一覧取得中にエラーが発生`
          );
        } else {
          // 直接APIにアクセス
          return makeApiRequest(
            endpoint,
            {
              method: 'GET',
              headers: headers
            },
            `${provider}モデル一覧取得中にエラーが発生`
          ).catch(error => {
            // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
              console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
              
              const proxyUrl = `${settings.proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/models/${provider.toLowerCase()}`;
              
              return makeApiRequest(
                proxyUrl,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ apiKey })
                },
                `中間サーバー経由での${provider}モデル一覧取得中にエラーが発生`
              );
            }
            
            throw error;
          });
        }
      })
      .then(data => {
        console.log(`${provider}モデル一覧取得成功:`, data);
        sendResponse({ models: dataProcessor(data) });
      })
      .catch(error => {
        console.error(`${provider}モデル一覧取得エラー:`, error);
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    
    return true;
  }
  
  // Anthropicモデル一覧リクエストの処理
  if (message.action === 'getAnthropicModels') {
    handleModelListRequest(
      'Anthropic',
      message.apiKey,
      'https://api.anthropic.com/v1/models',
      {
        'x-api-key': message.apiKey,
        'anthropic-version': '2023-06-01'
      },
      (data) => data.models || []
    );
    return true;
  }
  
  // OpenRouterモデル一覧リクエストの処理
  if (message.action === 'getOpenRouterModels') {
    handleModelListRequest(
      'OpenRouter',
      message.apiKey,
      'https://openrouter.ai/api/v1/models',
      {
        'Authorization': message.apiKey ? `Bearer ${message.apiKey}` : '',
        'HTTP-Referer': 'chrome-extension://llm-translator',
        'X-Title': 'LLM Translation Plugin'
      },
      (data) => data.data || []
    );
    return true;
  }
});