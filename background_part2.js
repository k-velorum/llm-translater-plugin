// OpenRouter APIでの翻訳（中間サーバー経由または直接アクセス）
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
}