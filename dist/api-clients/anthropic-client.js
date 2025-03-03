/**
 * Anthropic APIクライアント
 */
import BaseApiClient from './base-client.js';

class AnthropicClient extends BaseApiClient {
  /**
   * コンストラクタ
   * @param {Object} settings - 設定オブジェクト
   */
  constructor(settings) {
    super(settings);
    this.apiKey = settings.anthropicApiKey;
    this.model = settings.anthropicModel;
  }

  /**
   * テキストを翻訳する
   * @param {string} text - 翻訳するテキスト
   * @returns {Promise<string>} - 翻訳結果
   */
  async translateText(text) {
    if (!this.apiKey) {
      throw new Error('Anthropic APIキーが設定されていません');
    }
    
    const systemPrompt = '指示された文章を日本語に翻訳してください。翻訳結果のみを出力してください。';
    const messages = [
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
          system: systemPrompt,
          messages: messages,
          max_tokens: 1024
        };
        
        console.log(`Anthropic API リクエスト開始（中間サーバー経由）`);
        console.log(`使用モデル: ${this.model}`);
        console.log('Anthropic リクエストボディ:', JSON.stringify(body, null, 2));
        
        data = await this.makeProxyRequest(
          'anthropic',
          body,
          'Anthropic API リクエスト中にエラーが発生'
        );
      } else {
        // 直接APIにアクセス
        console.log(`Anthropic API リクエスト開始（直接アクセス）`);
        console.log(`使用モデル: ${this.model}`);
        
        data = await this.makeDirectRequest(
          'https://api.anthropic.com/v1/messages',
          {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          {
            model: this.model,
            system: systemPrompt,
            messages: messages,
            max_tokens: 1024
          },
          'Anthropic API リクエスト中にエラーが発生'
        );
      }
      
      return data.content[0].text.trim();
    } catch (error) {
      // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
      if (!this.useProxyServer && error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
        
        // 一時的に中間サーバーを利用する設定に変更
        const tempClient = new AnthropicClient({
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
      throw new Error('Anthropic APIキーが設定されていません');
    }
    
    try {
      let result;
      
      if (this.useProxyServer) {
        result = await this.makeProxyRequest(
          'verify/anthropic',
          { apiKey: this.apiKey },
          'Anthropic APIキー検証中にエラーが発生'
        );
      } else {
        result = await this.makeRequest(
          'https://api.anthropic.com/v1/models',
          {
            method: 'GET',
            headers: {
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01'
            }
          },
          'Anthropic APIキー検証中にエラーが発生'
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
      throw new Error('Anthropic APIキーが設定されていません');
    }
    
    try {
      let data;
      
      if (this.useProxyServer) {
        data = await this.makeProxyRequest(
          'models/anthropic',
          { apiKey: this.apiKey },
          'Anthropicモデル一覧取得中にエラーが発生'
        );
      } else {
        data = await this.makeRequest(
          'https://api.anthropic.com/v1/models',
          {
            method: 'GET',
            headers: {
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01'
            }
          },
          'Anthropicモデル一覧取得中にエラーが発生'
        );
      }
      
      // モデル情報を整形して返す
      return data.models.map(model => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || '',
        context_window: model.context_window,
        max_tokens: model.max_tokens
      }));
    } catch (error) {
      // 直接アクセスが失敗した場合、CORS制約の可能性があるため、中間サーバー経由で再試行
      if (!this.useProxyServer && error instanceof TypeError && error.message === 'Failed to fetch') {
        console.log('直接アクセスが失敗したため、中間サーバー経由で再試行します');
        
        // 一時的に中間サーバーを利用する設定に変更
        const tempClient = new AnthropicClient({
          ...this.settings,
          useProxyServer: true
        });
        
        return await tempClient.getModels();
      }
      
      console.error('Anthropicモデル一覧取得エラー:', error);
      throw error;
    }
  }
}

export default AnthropicClient;