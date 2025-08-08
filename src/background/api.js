import { DEFAULT_SETTINGS } from './settings.js';

// 共通プロンプト/ヘッダー
const TRANSLATE_PROMPT = '指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。';
const OPENROUTER_HEADERS_BASE = {
  'HTTP-Referer': 'chrome-extension://llm-translator',
  'X-Title': 'LLM Translation Plugin'
};

// 以前のプロキシフォールバックは削除（直接アクセスのみ）

// エラー詳細のフォーマット
export function formatErrorDetails(error, settings) {
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
  } else if (settings.apiProvider === 'ollama') {
    apiProvider = `Ollama (${settings.ollamaServer || 'http://localhost:11434'})`;
    modelName = settings.ollamaModel || '未選択';
    maskedApiKey = '不要';
  } else if (settings.apiProvider === 'lmstudio') {
    apiProvider = `LM Studio (${settings.lmstudioServer || 'http://localhost:1234'})`;
    modelName = settings.lmstudioModel || '未選択';
    maskedApiKey = maskApiKey(settings.lmstudioApiKey);
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

// APIリクエスト共通処理
export async function makeApiRequest(url, options, errorMessage) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      // Ollama の CORS で 403 が出やすいため、分かりやすいヒントを付与
      if (response.status === 403 && /\/api\/(generate|tags)/.test(url)) {
        throw new Error(
          'API Error: 403 Forbidden - おそらくOllamaのCORS設定が原因です。\n' +
          '環境変数 OLLAMA_ORIGINS を設定してサーバーを起動してください。例:\n' +
          '  macOS/Linux:  OLLAMA_ORIGINS=* ollama serve\n' +
          '  Windows(PowerShell):  $env:OLLAMA_ORIGINS="*"; ollama serve\n' +
          '特定の拡張IDのみ許可する場合は chrome-extension://<拡張ID> を指定してください。'
        );
      }
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
    { role: 'system', content: TRANSLATE_PROMPT },
    { role: 'user', content: text }
  ];

  {
    // 直接APIにアクセス

    try {
      const data = await makeApiRequest(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openrouterApiKey}`,
            ...OPENROUTER_HEADERS_BASE
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
                  text: `${TRANSLATE_PROMPT}\n\n${text}`
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

// Anthropic は削除済み

// Ollama (local server) での翻訳
async function translateWithOllama(text, settings) {
  const server = (settings.ollamaServer || 'http://localhost:11434').replace(/\/$/, '');
  if (!settings.ollamaModel) {
    throw new Error('Ollamaのモデルが選択されていません');
  }

  const apiUrl = `${server}/api/generate`;
  const prompt = `${TRANSLATE_PROMPT}\n\n${text}`;
  try {
    const data = await makeApiRequest(
      apiUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.ollamaModel,
          prompt,
          stream: false
        })
      },
      'Ollama API リクエスト中にエラーが発生'
    );
    // stream: false の場合、response に全文が入る
    return (data.response || '').trim();
  } catch (error) {
    throw error;
  }
}

// LM Studio (OpenAI互換) での翻訳
async function translateWithLmStudio(text, settings) {
  const server = (settings.lmstudioServer || 'http://localhost:1234').replace(/\/$/, '');
  if (!settings.lmstudioModel) {
    throw new Error('LM Studio のモデルが選択されていません');
  }

  const apiUrl = `${server}/v1/chat/completions`;
  const messages = [
    { role: 'system', content: TRANSLATE_PROMPT },
    { role: 'user', content: text }
  ];

  const headers = { 'Content-Type': 'application/json' };
  if (settings.lmstudioApiKey) headers['Authorization'] = `Bearer ${settings.lmstudioApiKey}`;

  const body = JSON.stringify({
    model: settings.lmstudioModel,
    messages,
    temperature: 0.2,
    stream: false
  });

  try {
    const data = await makeApiRequest(
      apiUrl,
      { method: 'POST', headers, body },
      'LM Studio API リクエスト中にエラーが発生'
    );
    return (data.choices?.[0]?.message?.content || '').trim();
  } catch (error) {
    throw error;
  }
}

// テキスト翻訳関数
export async function translateText(text, settings) {
  if (settings.apiProvider === 'openrouter') {
    return await translateWithOpenRouter(text, settings);
  } else if (settings.apiProvider === 'ollama') {
    return await translateWithOllama(text, settings);
  } else if (settings.apiProvider === 'lmstudio') {
    return await translateWithLmStudio(text, settings);
  } else {
    return await translateWithGemini(text, settings);
  }
}
