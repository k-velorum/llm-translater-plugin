/**
 * Google Gemini APIクライアント
 */
import BaseApiClient from './base-client.js';

class GeminiClient extends BaseApiClient {
  /**
   * コンストラクタ
   * @param {Object} settings - 設定オブジェクト
   */
  constructor(settings) {
    super(settings);
    this.apiKey = settings.geminiApiKey;
    this.model = settings.geminiModel;
  }

  /**
   * テキストを翻訳する
   * @param {string} text - 翻訳するテキスト
   * @returns {Promise<string>} - 翻訳結果
   */
  async translateText(text) {
    if (!this.apiKey) {
      throw new Error('Gemini APIキーが設定されていません');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    console.log(`Gemini API リクエスト開始: ${apiUrl.replace(this.apiKey, '***API_KEY***')}`);
    
    try {
      const data = await this.makeRequest(
        apiUrl,
        {
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

  /**
   * APIキーを検証する
   * @returns {Promise<Object>} - 検証結果
   */
  async verifyApiKey() {
    if (!this.apiKey) {
      throw new Error('Gemini APIキーが設定されていません');
    }
    
    try {
      // 簡単なテストリクエストを送信してAPIキーの有効性を確認
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      
      await this.makeRequest(
        apiUrl,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        },
        'Gemini APIキー検証中にエラーが発生'
      );
      
      return {
        isValid: true,
        message: 'APIキーは有効です'
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
      throw new Error('Gemini APIキーが設定されていません');
    }
    
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      
      const data = await this.makeRequest(
        apiUrl,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        },
        'Geminiモデル一覧取得中にエラーが発生'
      );
      
      // Geminiモデルのみをフィルタリング
      return data.models
        .filter(model => model.name.includes('gemini'))
        .map(model => ({
          id: model.name,
          name: model.displayName || model.name,
          description: model.description || '',
          version: model.version
        }));
    } catch (error) {
      console.error('Geminiモデル一覧取得エラー:', error);
      throw error;
    }
  }
}

export default GeminiClient;