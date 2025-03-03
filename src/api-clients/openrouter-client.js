/**
 * OpenRouter APIクライアント
 */
import BaseApiClient from './base-client.js';

class OpenRouterClient extends BaseApiClient {
  /**
   * コンストラクタ
   * @param {Object} settings - 設定オブジェクト
   */
  constructor(settings) {
    super(settings);
    this.apiKey = settings.openrouterApiKey;
    this.model = settings.openrouterModel;
  }

  /**
   * テキストを翻訳する
   * @param {string} text - 翻訳するテキスト
   * @returns {Promise<string>} - 翻訳結果
   */
  async translateText(text) {
    if (!this.apiKey) {
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
    
    try {
      let data;
      
      if (this.useProxyServer) {
        // 中間サーバー経由でのリクエスト
        const body = {
          apiKey: this.apiKey,
          model: this.model,
          messages: messages
        };
        
        console.log(`使用モデル: ${this.model}`);
        console.log('OpenRouter リクエストボディ:', JSON.stringify(body, null, 2));
        
        data = await this.makeProxyRequest(
          'openrouter',
          body,
          'OpenRouter API リクエスト中にエラーが発生'
        );
      } else {
        // 直接APIにアクセス
        console.log(`使用モデル: ${this.model}`);
        
        data = await this.makeDirectRequest(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'chrome-extension://llm-translator',
            'X-Title': 'LLM Translation Plugin'
          },
          {
            model: this.model,
            messages: messages
          },
          'OpenRouter API リクエスト中にエラーが発生'
        );
      }
      
      return data.choices[0].message.content.trim();
    } catch (error) {
      // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
      if (!this.useProxyServer && error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
        
        // 一時的に中間サーバーを利用する設定に変更
        const tempClient = new OpenRouterClient({
          ...this.settings,
          useProxyServer: true
        });
        
        return await tempClient.translateText(text);
      }
      
      throw error;
    }
  }

  /**
   * APIキーを検証する
   * @returns {Promise<Object>} - 検証結果
   */
  async verifyApiKey() {
    if (!this.apiKey) {
      throw new Error('OpenRouter APIキーが設定されていません');
    }
    
    try {
      let result;
      
      if (this.useProxyServer) {
        result = await this.makeProxyRequest(
          'verify/openrouter',
          { apiKey: this.apiKey },
          'OpenRouter APIキー検証中にエラーが発生'
        );
      } else {
        result = await this.makeRequest(
          'https://openrouter.ai/api/v1/models',
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'HTTP-Referer': 'chrome-extension://llm-translator',
              'X-Title': 'LLM Translation Plugin'
            }
          },
          'OpenRouter APIキー検証中にエラーが発生'
        );
      }
      
      return {
        isValid: true,
        message: 'APIキーは有効です',
        models: result
      };
    } catch (error) {
      return {
        isValid: false,
        message: `APIキー検証エラー: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * 利用可能なモデル一覧を取得する
   * @returns {Promise<Array>} - モデル一覧
   */
  async getModels() {
    if (!this.apiKey) {
      throw new Error('OpenRouter APIキーが設定されていません');
    }
    
    try {
      let data;
      
      if (this.useProxyServer) {
        data = await this.makeProxyRequest(
          'models/openrouter',
          { apiKey: this.apiKey },
          'OpenRouterモデル一覧取得中にエラーが発生'
        );
      } else {
        data = await this.makeRequest(
          'https://openrouter.ai/api/v1/models',
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'HTTP-Referer': 'chrome-extension://llm-translator',
              'X-Title': 'LLM Translation Plugin'
            }
          },
          'OpenRouterモデル一覧取得中にエラーが発生'
        );
      }
      
      // モデル情報を整形して返す
      return data.data.map(model => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || '',
        context_length: model.context_length,
        pricing: model.pricing
      }));
    } catch (error) {
      console.error('OpenRouterモデル一覧取得エラー:', error);
      throw error;
    }
  }
}

export default OpenRouterClient;