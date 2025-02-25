// デフォルト設定
const DEFAULT_SETTINGS = {
  apiProvider: 'openrouter', // openrouter または gemini
  openrouterApiKey: '',
  openrouterModel: 'anthropic/claude-3.5-haiku',
  geminiApiKey: 'YOUR_API_KEY',
  geminiModel: 'gemini-flash-2.0'
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
    
    // タブが存在することを確認
    try {
      // タブの状態を確認（これによりタブが存在するか検証）
      await chrome.tabs.get(tab.id);
      
      try {
        const translatedText = await translateText(selectedText, settings);
        
        // Service Workerが生きていることを確保
        const keepAlivePromise = new Promise(resolve => setTimeout(resolve, 0));
        await keepAlivePromise;
        
        // コンテンツスクリプトに翻訳結果を送信
        // エラーハンドリングを追加
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showTranslation',
            translatedText: translatedText
          });
        } catch (sendError) {
          console.error('メッセージ送信エラー:', sendError);
          // 再試行
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, {
                action: 'showTranslation',
                translatedText: translatedText
              });
            } catch (retryError) {
              console.error('メッセージ再送信でもエラー:', retryError);
            }
          }, 100);
        }
        
      } catch (error) {
        console.error('翻訳エラー:', error);

        // APIキーをマスクする関数
        const maskApiKey = (apiKey) => {
          if (!apiKey) return '未設定';
          if (apiKey.length <= 8) return '********';
          return apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
        };
        
        // エラーメッセージの詳細を作成
        let apiProvider = settings.apiProvider === 'openrouter' ? 'OpenRouter' : 'Google Gemini';
        let modelName = settings.apiProvider === 'openrouter' ? settings.openrouterModel : settings.geminiModel;
        let maskedApiKey = settings.apiProvider === 'openrouter' 
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
        
        // Service Workerが生きていることを確保
        const keepAlivePromise = new Promise(resolve => setTimeout(resolve, 0));
        await keepAlivePromise;
        
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showTranslation',
            translatedText: errorDetails
          });
        } catch (sendError) {
          console.error('エラーメッセージ送信エラー:', sendError);
          // 再試行
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tab.id, {
                action: 'showTranslation',
                translatedText: errorDetails
              });
            } catch (retryError) {
              console.error('エラーメッセージ再送信でもエラー:', retryError);
            }
          }, 100);
        }
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

// OpenRouter APIでの翻訳
async function translateWithOpenRouter(text, settings) {
  if (!settings.openrouterApiKey) {
    throw new Error('OpenRouter APIキーが設定されていません');
  }

  const apiUrl = 'https://api.openrouter.ai/api/v1/chat/completions';
  console.log(`OpenRouter API リクエスト開始: ${apiUrl}`);
  console.log(`使用モデル: ${settings.openrouterModel}`);
  
  try {
    // ヘッダーには英語のみ使用（ISO-8859-1コードポイントのみ）
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openrouterApiKey}`,
      'HTTP-Referer': 'chrome-extension://llm-translator',
      'X-Title': 'LLM Translation Plugin' // 日本語を英語に変更
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
        // JSONパースエラーの場合はテキストで取得を試みる
        try {
          errorText = await response.text();
          console.error('OpenRouter エラーテキスト:', errorText);
        } catch (textError) {
          errorText = 'レスポンステキストを取得できませんでした';
        }
        throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
      }
    }

    // レスポンスをログに記録
    const data = await response.json();
    console.log('OpenRouter 成功レスポンス:', JSON.stringify(data, null, 2));
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenRouter API リクエスト中にエラーが発生:', error);
    
    // より具体的なエラーメッセージ
    if (error instanceof TypeError && error.message.includes('Failed to execute \'fetch\'')) {
      if (error.message.includes('non ISO-8859-1 code point')) {
        throw new Error('HTTP ヘッダーに非ASCII文字が含まれています。ヘッダー値は英語（ASCII文字）のみ使用してください。');
      } else {
        throw new Error(`ネットワーク接続エラー: OpenRouterのAPIエンドポイント(${apiUrl})に接続できません。インターネット接続またはAPIキーを確認してください。`);
      }
    }
    
    throw error;
  }
}

// Google Gemini APIでの翻訳
async function translateWithGemini(text, settings) {
  if (!settings.geminiApiKey) {
    throw new Error('Gemini APIキーが設定されていません');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent?key=${settings.geminiApiKey}`;
  console.log(`Gemini API リクエスト開始: ${apiUrl.replace(settings.geminiApiKey, '***API_KEY***')}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
        generationConfig: {
          temperature: 0.2
        }
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

// ポップアップからのメッセージ処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('バックグラウンドスクリプトがメッセージを受信:', message);

  if (message.action === 'testOpenRouter') {
    console.log('ポップアップからのOpenRouterテストリクエストを受信:', message);
    
    // OpenRouterをテスト
    testOpenRouter(message.text, message.apiKey, message.model)
      .then(result => {
        console.log('OpenRouterテスト成功:', result);
        sendResponse({ result: result });
      })
      .catch(error => {
        console.error('OpenRouterテストエラー:', error);
        sendResponse({ 
          error: {
            message: error.message,
            details: error.stack || ''
          }
        });
      });
    
    // 非同期レスポンスのため true を返す
    return true;
  }
  
  if (message.action === 'verifyOpenRouterApiKey') {
    console.log('ポップアップからのOpenRouter APIキー検証リクエストを受信');
    
    // OpenRouter APIキーを検証
    verifyOpenRouterApiKey(message.apiKey)
      .then(result => {
        console.log('OpenRouter APIキー検証成功:', result);
        sendResponse({ result: result });
      })
      .catch(error => {
        console.error('OpenRouter APIキー検証エラー:', error);
        sendResponse({ 
          error: {
            message: error.message,
            details: error.stack || ''
          }
        });
      });
    
    // 非同期レスポンスのため true を返す
    return true;
  }
});

// OpenRouter APIキーを検証する関数
async function verifyOpenRouterApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('APIキーが指定されていません');
  }

  console.log('OpenRouter APIキーを検証中...');
  
  // より確実に検証するため、モデル一覧を取得
  const apiUrl = 'https://api.openrouter.ai/api/v1/models';
  
  // 様々な方法を試す
  try {
    // 方法1: fetch APIを使用
    const response = await fetch(apiUrl, {
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
    
    // 方法2: XMLHttpRequestを使用
    return new Promise((resolve, reject) => {
      console.log('XMLHttpRequestを使ってOpenRouter APIキーを検証中...');
      
      const xhr = new XMLHttpRequest();
      xhr.open('GET', apiUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
      xhr.setRequestHeader('HTTP-Referer', 'chrome-extension://llm-translator');
      xhr.setRequestHeader('X-Title', 'LLM Translation Plugin');
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          console.log(`XHR検証 - ステータス: ${xhr.status}`);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({
                isValid: true,
                message: 'APIキーは有効です (XHR)',
                models: data.data ? data.data.length : 'データ形式が不明'
              });
            } catch (parseError) {
              reject(new Error(`レスポンスのJSONパースエラー: ${parseError.message}`));
            }
          } else {
            reject(new Error(`APIキーが無効です (XHR): ${xhr.statusText} (${xhr.status})`));
          }
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('ネットワークエラーが発生しました (XHR)'));
      };
      
      xhr.send();
    });
  }
}

// OpenRouter APIをテストする関数
async function testOpenRouter(text, apiKey, model) {
  if (!apiKey) {
    throw new Error('OpenRouter APIキーが設定されていません');
  }

  const apiUrl = 'https://api.openrouter.ai/api/v1/chat/completions';
  console.log(`OpenRouter APIテスト開始: ${apiUrl}`);
  console.log(`使用モデル: ${model}`);
  
  try {
    // ヘッダーを詳細にデバッグ出力
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'chrome-extension://llm-translator',
      'X-Title': 'LLM Translation Plugin'
    };
    
    console.log('OpenRouterテスト - ヘッダー:', Object.keys(headers).join(', '));
    
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

    // 方法1: 標準のfetch API
    try {
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
          // JSONパースエラーの場合はテキストで取得
          try {
            errorText = await response.text();
            console.error('OpenRouterテスト - エラーテキスト:', errorText);
          } catch (textError) {
            errorText = 'レスポンステキストを取得できませんでした';
          }
          throw new Error(`API Error: ${response.statusText} (${response.status}) - ${errorText}`);
        }
      }

      // レスポンスを処理
      const data = await response.json();
      console.log('OpenRouterテスト - 成功レスポンス:', JSON.stringify(data, null, 2));
      
      return data.choices[0].message.content.trim();
    } catch (fetchError) {
      console.error('OpenRouterテスト中にfetchエラーが発生:', fetchError);
      
      // 方法2: XMLHttpRequestを試す（CORSの問題がある場合に有効な場合がある）
      console.log('fetchに失敗したため、XMLHttpRequestでリトライ中...');
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', apiUrl, true);
        
        // ヘッダーの設定
        Object.keys(headers).forEach(key => {
          xhr.setRequestHeader(key, headers[key]);
        });
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            console.log(`XHR - ステータス: ${xhr.status}`);
            
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                console.log('XHR - 成功レスポンス:', data);
                resolve(data.choices[0].message.content.trim());
              } catch (parseError) {
                reject(new Error(`レスポンスのJSONパースエラー: ${parseError.message}`));
              }
            } else {
              let errorMessage = `API Error (XHR): ${xhr.statusText} (${xhr.status})`;
              try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage += ` - ${JSON.stringify(errorData)}`;
              } catch (parseError) {
                // パースに失敗した場合は、生のレスポンステキストを使用
                if (xhr.responseText) {
                  errorMessage += ` - ${xhr.responseText}`;
                }
              }
              reject(new Error(errorMessage));
            }
          }
        };
        
        xhr.onerror = function(event) {
          console.error('XHRエラーイベント:', event);
          reject(new Error('ネットワークエラーが発生しました (XHR)'));
        };
        
        xhr.ontimeout = function() {
          reject(new Error('リクエストがタイムアウトしました (XHR)'));
        };
        
        xhr.timeout = 30000; // 30秒
        
        try {
          xhr.send(JSON.stringify(body));
        } catch (sendError) {
          reject(new Error(`XHRリクエスト送信エラー: ${sendError.message}`));
        }
      });
    }
  } catch (error) {
    console.error('OpenRouterテスト中にエラーが発生:', error);
    
    // エラーメッセージの詳細化
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(`ネットワークエラー: OpenRouterのAPIエンドポイント(${apiUrl})に接続できません。CORS制限、ネットワーク接続、またはAPIキーを確認してください。`);
      enhancedError.stack = error.stack;
      throw enhancedError;
    }
    
    throw error;
  }
}