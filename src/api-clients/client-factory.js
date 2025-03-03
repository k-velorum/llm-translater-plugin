/**
 * APIクライアントファクトリー
 */
import OpenRouterClient from './openrouter-client.js';
import GeminiClient from './gemini-client.js';
import AnthropicClient from './anthropic-client.js';

/**
 * 設定に基づいて適切なAPIクライアントを作成する
 * @param {Object} settings - 設定オブジェクト
 * @returns {BaseApiClient} - APIクライアントインスタンス
 */
function createApiClient(settings) {
  const provider = settings.apiProvider;
  
  switch (provider) {
    case 'openrouter':
      return new OpenRouterClient(settings);
    case 'gemini':
      return new GeminiClient(settings);
    case 'anthropic':
      return new AnthropicClient(settings);
    default:
      throw new Error(`未対応のAPIプロバイダー: ${provider}`);
  }
}

/**
 * 指定されたプロバイダーのAPIクライアントを作成する
 * @param {Object} settings - 設定オブジェクト
 * @param {string} provider - プロバイダー名
 * @returns {BaseApiClient} - APIクライアントインスタンス
 */
function createSpecificApiClient(settings, provider) {
  switch (provider) {
    case 'openrouter':
      return new OpenRouterClient(settings);
    case 'gemini':
      return new GeminiClient(settings);
    case 'anthropic':
      return new AnthropicClient(settings);
    default:
      throw new Error(`未対応のAPIプロバイダー: ${provider}`);
  }
}

export { createApiClient, createSpecificApiClient };