/**
 * API関連のユーティリティ関数
 */

/**
 * APIリクエストを実行する共通関数
 * @param {string} url - リクエスト先URL
 * @param {Object} options - fetchオプション
 * @param {string} errorMessage - エラー時のメッセージ
 * @returns {Promise<Object>} - レスポンスデータ
 */
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

/**
 * APIキーをマスクする関数
 * @param {string} apiKey - マスクするAPIキー
 * @returns {string} - マスクされたAPIキー
 */
function maskApiKey(apiKey) {
  if (!apiKey) return '未設定';
  if (apiKey.length <= 8) return '********';
  return apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
}

/**
 * エラー詳細のフォーマット
 * @param {Error} error - エラーオブジェクト
 * @param {Object} settings - 設定オブジェクト
 * @returns {string} - フォーマットされたエラー詳細
 */
function formatErrorDetails(error, settings) {
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

export { makeApiRequest, maskApiKey, formatErrorDetails };