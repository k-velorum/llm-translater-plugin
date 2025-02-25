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