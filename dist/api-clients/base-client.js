/**
 * APIクライアントの基底クラス
 */
import { makeApiRequest } from '../utils/api-utils.js';

class BaseApiClient {
  /**
   * コンストラクタ
   * @param {Object} settings - 設定オブジェクト
   */
  constructor(settings) {
    this.settings = settings;
    this.proxyServerUrl = settings.proxyServerUrl || 'http://localhost:3000';
    this.useProxyServer = settings.useProxyServer || false;
  }

  /**
   * APIリクエストを実行する
   * @param {string} url - リクエスト先URL
   * @param {Object} options - fetchオプション
   * @param {string} errorMessage - エラー時のメッセージ
   * @returns {Promise<Object>} - レスポンスデータ
   */
  async makeRequest(url, options, errorMessage) {
    return makeApiRequest(url, options, errorMessage);
  }

  /**
   * 中間サーバー経由でリクエストを実行する
   * @param {string} endpoint - エンドポイント名
   * @param {Object} body - リクエストボディ
   * @param {string} errorMessage - エラー時のメッセージ
   * @returns {Promise<Object>} - レスポンスデータ
   */
  async makeProxyRequest(endpoint, body, errorMessage) {
    const proxyUrl = `${this.proxyServerUrl}/api/${endpoint}`;
    console.log(`API リクエスト開始（中間サーバー経由）: ${proxyUrl}`);
    
    return this.makeRequest(
      proxyUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      },
      errorMessage
    );
  }

  /**
   * 直接APIにリクエストを実行する
   * @param {string} url - リクエスト先URL
   * @param {Object} headers - リクエストヘッダー
   * @param {Object} body - リクエストボディ
   * @param {string} errorMessage - エラー時のメッセージ
   * @returns {Promise<Object>} - レスポンスデータ
   */
  async makeDirectRequest(url, headers, body, errorMessage) {
    console.log(`API リクエスト開始（直接アクセス）: ${url}`);
    
    return this.makeRequest(
      url,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      },
      errorMessage
    );
  }

  /**
   * テキストを翻訳する（サブクラスで実装）
   * @param {string} text - 翻訳するテキスト
   * @returns {Promise<string>} - 翻訳結果
   */
  async translateText(text) {
    throw new Error('translateText method must be implemented by subclass');
  }

  /**
   * APIキーを検証する（サブクラスで実装）
   * @returns {Promise<Object>} - 検証結果
   */
  async verifyApiKey() {
    throw new Error('verifyApiKey method must be implemented by subclass');
  }

  /**
   * 利用可能なモデル一覧を取得する（サブクラスで実装）
   * @returns {Promise<Array>} - モデル一覧
   */
  async getModels() {
    throw new Error('getModels method must be implemented by subclass');
  }
}

export default BaseApiClient;