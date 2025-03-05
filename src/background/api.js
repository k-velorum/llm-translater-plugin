import { DEFAULT_SETTINGS } from './settings.js';

// APIリクエスト共通処理
async function makeApiRequest(url, options, errorMessage, timeout = 30000) {
  try {
    // タイムアウト処理を追加
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // AbortControllerのsignalをfetchに渡す
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    try {
      const response = await fetch(url, fetchOptions);
      // タイムアウトをクリア
      clearTimeout(timeoutId);
      
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
    } catch (fetchError) {
      // タイムアウトをクリア（エラー発生時も）
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    
    // AbortErrorの場合はタイムアウトエラーとして処理
    if (error.name === 'AbortError') {
      throw new Error(`タイムアウトエラー: APIリクエストが${timeout / 1000}秒以内に完了しませんでした。`);
    }
    
    throw error;
  }
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
  
  // APIリクエストのタイムアウト時間を設定（ミリ秒）
  const timeout = 60000; // 60秒
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent?key=${settings.geminiApiKey}`;
  console.log(`Gemini API リクエスト開始: ${apiUrl.replace(settings.geminiApiKey, '***API_KEY***')}`);
  console.log(`使用モデル: ${settings.geminiModel}`);
  
  try {
    // リクエストボディを作成
    const requestBody = {
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
    };
    
    console.log('Gemini リクエストボディ:', JSON.stringify(requestBody, null, 2));
    
    // タイムアウト付きでAPIリクエストを実行
    const data = await makeApiRequest(
      apiUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      },
      'Gemini API リクエスト中にエラーが発生',
      timeout
    );
    
    // レスポンスの検証
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Gemini APIから予期しない形式のレスポンスを受信:', data);
      throw new Error('Gemini APIから予期しない形式のレスポンスを受信しました');
    }
    
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini API エラー詳細:', error);
    
    if (error.name === 'AbortError') {
      throw new Error(`Gemini APIリクエストがタイムアウトしました（${timeout / 1000}秒）。再度お試しください。`);
    }
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('ネットワーク接続エラー: Gemini APIに接続できません。インターネット接続を確認してください。');
    }
    
    // その他のエラーはそのまま再スロー
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

export { 
  makeApiRequest, 
  translateText, 
  translateWithOpenRouter, 
  translateWithGemini, 
  translateWithAnthropic 
};