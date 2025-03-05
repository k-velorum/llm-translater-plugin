import { loadSettings } from './settings.js';
import { makeApiRequest, translateText } from './api.js';
import { DEFAULT_SETTINGS } from './settings.js';

// バックグラウンドでのメッセージ処理
function setupMessageHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('バックグラウンドスクリプトがメッセージを受信:', message);
    
    // メッセージチャネルが閉じられるのを防ぐためのタイムアウト処理
    let keepAliveInterval = null;
    
    // 非同期処理中にメッセージチャネルを開いたままにするための関数
    const startKeepAlive = () => {
      // 25秒ごとに空のオブジェクトを送信してチャネルを開いたままにする
      keepAliveInterval = setInterval(() => {
        try {
          console.log('メッセージチャネルを維持するためのキープアライブ信号を送信');
          sendResponse({ keepAlive: true });
        } catch (error) {
          // チャネルが既に閉じられている場合はエラーが発生するが無視
          console.log('キープアライブ中にエラーが発生（無視可能）:', error);
          clearInterval(keepAliveInterval);
        }
      }, 25000); // Chrome拡張のメッセージチャネルは30秒でタイムアウトするため、余裕を持って25秒に設定
    };
    
    // 非同期処理完了時にキープアライブを停止する関数
    const stopKeepAlive = () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
    };
    
    // ツイート翻訳リクエストの処理
    if (message.action === 'translateTweet') {
      console.log('ツイート翻訳リクエストを受信:', message);
      startKeepAlive();
      
      loadSettings()
        .then(settings => translateText(message.text, settings))
        .then(translatedText => {
          console.log('ツイート翻訳成功:', translatedText);
          stopKeepAlive();
          sendResponse({ translatedText: translatedText });
        })
        .catch(error => {
          console.error('ツイート翻訳エラー:', error);
          stopKeepAlive();
          sendResponse({ error: { message: error.message, details: error.stack || '' } });
        });
      return true; // 非同期レスポンスを示すためにtrueを返す
    }
    
    // テスト翻訳リクエストの処理
    if (message.action === 'testTranslate') {
      console.log('ポップアップからのテスト翻訳リクエストを受信:', message);
      startKeepAlive();
      
      translateText(message.text, message.settings)
        .then(result => {
          console.log('テスト翻訳成功:', result);
          stopKeepAlive();
          sendResponse({ result: result });
        })
        .catch(error => {
          console.error('テスト翻訳エラー:', error);
          stopKeepAlive();
          sendResponse({ error: { message: error.message, details: error.stack || '' } });
        });
      return true;
    }
    
    // APIキー検証とモデル一覧取得の共通処理
    function handleApiRequest(action, apiKey, endpoint, headers, successCallback) {
      console.log(`ポップアップからの${action}リクエストを受信`);
      startKeepAlive();
      
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
          stopKeepAlive();
          successCallback(result);
        })
        .catch(error => {
          console.error(`${action}エラー:`, error);
          stopKeepAlive();
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
    
    // Gemini APIキー検証リクエストの処理
    if (message.action === 'verifyGeminiApiKey') {
      const apiKey = message.apiKey;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      
      console.log('Gemini APIキー検証リクエストを受信');
      startKeepAlive();
      
      makeApiRequest(
        endpoint,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        },
        'Gemini APIキー検証中にエラーが発生',
        30000 // 30秒のタイムアウト
      )
        .then(result => {
          console.log('Gemini APIキー検証成功:', result);
          stopKeepAlive();
          sendResponse({
            result: {
              isValid: true,
              message: 'APIキーは有効です',
              models: 'データ取得成功'
            }
          });
        })
        .catch(error => {
          console.error('Gemini APIキー検証エラー:', error);
          stopKeepAlive();
          sendResponse({
            error: {
              message: `Gemini APIキーの検証に失敗しました: ${error.message}`,
              details: error.stack || ''
            }
          });
        });
      
      return true;
    }
    
    // モデル一覧取得の共通処理
    function handleModelListRequest(provider, apiKey, endpoint, headers, dataProcessor) {
      console.log(`ポップアップからの${provider}モデル一覧リクエストを受信`);
      startKeepAlive();
      
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
          stopKeepAlive();
          sendResponse({ models: dataProcessor(data) });
        })
        .catch(error => {
          console.error(`${provider}モデル一覧取得エラー:`, error);
          stopKeepAlive();
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
    
    // Geminiモデル一覧リクエストの処理
    if (message.action === 'getGeminiModels') {
      console.log('Geminiモデル一覧リクエストを受信');
      startKeepAlive();
      
      const apiKey = message.apiKey;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      
      makeApiRequest(
        endpoint,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        },
        'Geminiモデル一覧取得中にエラーが発生',
        30000 // 30秒のタイムアウト
      )
        .then(data => {
          console.log('Geminiモデル一覧取得成功:', data);
          
          // Gemini APIからのレスポンスを処理
          const models = data.models || [];
          // 翻訳に適したモデルのみをフィルタリング
          const filteredModels = models.filter(model => 
            model.name.includes('gemini') && 
            model.supportedGenerationMethods.includes('generateContent')
          );
          
          stopKeepAlive();
          sendResponse({ models: filteredModels });
        })
        .catch(error => {
          console.error('Geminiモデル一覧取得エラー:', error);
          stopKeepAlive();
          sendResponse({ 
            error: { 
              message: `Geminiモデル一覧の取得に失敗しました: ${error.message}`,
              details: error.stack || '' 
            } 
          });
        });
      
      return true;
    }
  });
}

export { setupMessageHandlers };