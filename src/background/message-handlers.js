import { loadSettings, DEFAULT_SETTINGS } from './settings.js';
import { translateText, makeApiRequest } from './api.js';

// APIキー検証とモデル一覧取得の共通処理
async function handleApiRequest(action, apiKey, endpoint, headers, successCallback, errorCallback, settings) {
  console.log(`ポップアップからの${action}リクエストを受信`);

  try {
    let result;
    // 中間サーバーを利用するかどうかの設定に基づいて処理を分岐
    if (settings.useProxyServer) {
      result = await handleProxyRequest(action, apiKey, settings.proxyServerUrl);
    } else {
      result = await handleDirectRequest(endpoint, headers);
    }
    console.log(`${action}成功:`, result);
    successCallback(result);
  } catch (error) {
    console.error(`${action}エラー:`, error);
    errorCallback({ message: error.message, details: error.stack || '' });
  }
}

// 中間サーバー経由でのリクエスト処理
async function handleProxyRequest(action, apiKey, proxyServerUrl) {
  const proxyAction = action.includes('検証') ? `verify/${action.split(' ')[0].toLowerCase()}` : `models/${action.split(' ')[0].toLowerCase()}`;
  const proxyUrl = `${proxyServerUrl || DEFAULT_SETTINGS.proxyServerUrl}/api/${proxyAction}`;

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
async function handleDirectRequest(endpoint, headers) {
  return makeApiRequest(
    endpoint,
    {
      method: 'GET',
      headers: headers
    },
    'API直接アクセス中にエラーが発生'
  );
}

// モデル一覧取得の共通処理
async function handleModelListRequest(provider, apiKey, endpoint, headers, dataProcessor, sendResponse, settings) {
  const action = `${provider}モデル一覧取得`;
  await handleApiRequest(
    action,
    apiKey,
    endpoint,
    headers,
    (result) => {
      const models = dataProcessor(result);
      console.log(`${provider}モデル一覧取得成功:`, models);
      sendResponse({ models: models });
    },
    (error) => {
      // APIキーなしでも取得できるOpenRouterの場合はエラーを無視してデフォルトを返す
      if (provider === 'OpenRouter' && !apiKey) {
         console.warn('OpenRouter APIキー未設定のため、公開モデル一覧を取得します。');
         // ここで公開モデル取得のロジックを再度呼ぶか、デフォルトを返す
         // 今回は簡略化のため、エラーを返しつつ、popup.js側でデフォルトを使う想定
         sendResponse({ error: { message: 'APIキー未設定ですが、処理は継続します。', details: error.details } });
      } else {
        sendResponse({ error: error });
      }
    },
    settings
  );
}


// バックグラウンドでのメッセージ処理
export function handleBackgroundMessage(message, sender, sendResponse) {
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
        // エラーオブジェクト全体を送るのではなく、必要な情報だけ送る
        sendResponse({ error: { message: error.message, details: error.stack || '' } });
      });
    return true; // 非同期レスポンスを示すためにtrueを返す
  }

  // テスト翻訳リクエストの処理
  if (message.action === 'testTranslate') {
    console.log('ポップアップからのテスト翻訳リクエストを受信:', message);
    // message.settings を直接使うのではなく、loadSettingsで最新を取得する方が安全かもしれない
    loadSettings()
      .then(currentSettings => {
        // popupからの設定で上書きする（APIキーやモデルなど）
        const testSettings = { ...currentSettings, ...message.settings };
        return translateText(message.text, testSettings);
      })
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
    loadSettings().then(settings => {
      handleApiRequest(
        'OpenRouter APIキー検証',
        message.apiKey,
        'https://openrouter.ai/api/v1/models',
        {
          'Authorization': `Bearer ${message.apiKey}`,
          'HTTP-Referer': 'chrome-extension://llm-translator', // 適切な値に変更
          'X-Title': 'LLM Translation Plugin' // 適切な値に変更
        },
        (result) => {
          sendResponse({
            result: {
              success: true,
              models: result.data // モデルデータも返す
            }
          });
        },
        (error) => sendResponse({ error: error }),
        settings
      );
    });
    return true;
  }

  // Anthropic APIキー検証リクエストの処理
  if (message.action === 'verifyAnthropicApiKey') {
     loadSettings().then(settings => {
        handleApiRequest(
          'Anthropic APIキー検証',
          message.apiKey,
          'https://api.anthropic.com/v1/models', // Anthropicのモデル一覧エンドポイントは存在しないため、別の方法（例：messages APIを試す）が必要かも
          {
            'x-api-key': message.apiKey,
            'anthropic-version': '2023-06-01'
          },
          (result) => {
             // Anthropicにはモデル一覧APIがないため、成功応答のみ返す
            sendResponse({ result: { success: true } });
          },
          (error) => sendResponse({ error: error }),
          settings
       );
     });
    return true;
  }

  // OpenRouterモデル一覧取得リクエストの処理
  if (message.action === 'getOpenRouterModels') {
    loadSettings().then(settings => {
      const key = message.apiKey || settings.openrouterApiKey;
      const headers = {
        'HTTP-Referer': 'chrome-extension://llm-translator',
        'X-Title': 'LLM Translation Plugin'
      };
      if (key) headers['Authorization'] = `Bearer ${key}`;
      handleModelListRequest('OpenRouter', key, 'https://openrouter.ai/api/v1/models', headers, (result) => result.data, sendResponse, settings);
    });
    return true;
  }

  // Anthropicモデル一覧取得リクエストの処理
  if (message.action === 'getAnthropicModels') {
     loadSettings().then(settings => {
        handleModelListRequest(
          'Anthropic',
          message.apiKey || settings.anthropicApiKey,
          'https://api.anthropic.com/v1/models', // 存在しないエンドポイント。中間サーバー経由が必須になる
          {
            'x-api-key': message.apiKey || settings.anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          (result) => result.data, // Anthropicのレスポンス形式に合わせる (仮)
          sendResponse,
          settings
       );
     });
    return true;
  }

  // Gemini APIキー検証
  if (message.action === 'verifyGeminiApiKey') {
    const apiKey = message.apiKey;
    if (!apiKey) {
      sendResponse({ error: { message: 'Gemini APIキーが未指定です' } });
      return true;
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    makeApiRequest(endpoint, { method: 'GET' }, 'Gemini APIキー検証中にエラーが発生')
      .then(() => sendResponse({ result: { success: true } }))
      .catch((error) => sendResponse({ error: { message: error.message, details: error.stack || '' } }));
    return true;
  }

  // Gemini モデル一覧取得
  if (message.action === 'getGeminiModels') {
    const apiKey = message.apiKey;
    if (!apiKey) {
      sendResponse({ error: { message: 'Gemini APIキーが未指定です' } });
      return true;
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    makeApiRequest(endpoint, { method: 'GET' }, 'Gemini モデル一覧取得中にエラーが発生')
      .then((result) => {
        const modelsArr = result.models || [];
        const models = modelsArr.map(m => ({ id: (m.name || '').replace('models/', ''), name: m.displayName || m.name, context_length: m.inputTokenLimit }));
        sendResponse({ models });
      })
      .catch((error) => sendResponse({ error: { message: error.message, details: error.stack || '' } }));
    return true;
  }

  // 他のメッセージタイプがあればここに追加

  console.log('未処理のメッセージ:', message);
  return false; // 同期的に処理が完了したか、処理するハンドラがなかった場合
}
