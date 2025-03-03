/**
 * 翻訳機能のコアモジュール
 */
import { createApiClient } from '../api-clients/client-factory.js';
import { formatErrorDetails } from '../utils/api-utils.js';

/**
 * テキストを翻訳する
 * @param {string} text - 翻訳するテキスト
 * @param {Object} settings - 設定オブジェクト
 * @returns {Promise<string>} - 翻訳結果
 */
async function translateText(text, settings) {
  try {
    const apiClient = createApiClient(settings);
    return await apiClient.translateText(text);
  } catch (error) {
    console.error('翻訳エラー:', error);
    return formatErrorDetails(error, settings);
  }
}

/**
 * テスト翻訳を実行する
 * @param {string} text - 翻訳するテキスト
 * @param {Object} settings - 設定オブジェクト
 * @returns {Promise<Object>} - 翻訳結果または翻訳エラー
 */
async function testTranslate(text, settings) {
  try {
    const apiClient = createApiClient(settings);
    const result = await apiClient.translateText(text);
    return { result };
  } catch (error) {
    console.error('テスト翻訳エラー:', error);
    return { 
      error: { 
        message: error.message, 
        details: error.stack || '' 
      } 
    };
  }
}

/**
 * ツイートを翻訳する
 * @param {string} text - 翻訳するテキスト
 * @param {Object} settings - 設定オブジェクト
 * @returns {Promise<Object>} - 翻訳結果または翻訳エラー
 */
async function translateTweet(text, settings) {
  try {
    const apiClient = createApiClient(settings);
    const translatedText = await apiClient.translateText(text);
    return { translatedText };
  } catch (error) {
    console.error('ツイート翻訳エラー:', error);
    return { 
      error: { 
        message: error.message, 
        details: error.stack || '' 
      } 
    };
  }
}

export { translateText, testTranslate, translateTweet };