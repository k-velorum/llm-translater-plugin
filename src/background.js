/**
 * バックグラウンドスクリプト
 */
import { DEFAULT_SETTINGS, loadSettings } from './settings/settings.js';
import { initContextMenu, handleContextMenuClick } from './context-menu/context-menu.js';
import { translateText, testTranslate, translateTweet } from './translation/translator.js';
import { createApiClient, createSpecificApiClient } from './api-clients/client-factory.js';

// 拡張機能の初期化
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    chrome.storage.sync.set(settings);
  });
  
  // コンテキストメニューの初期化
  initContextMenu();
});

// コンテキストメニューのクリックイベント
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// バックグラウンドでのメッセージ処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('バックグラウンドスクリプトがメッセージを受信:', message);
  
  // ツイート翻訳リクエストの処理
  if (message.action === 'translateTweet') {
    console.log('ツイート翻訳リクエストを受信:', message);
    loadSettings()
      .then(settings => translateTweet(message.text, settings))
      .then(response => {
        console.log('ツイート翻訳結果:', response);
        sendResponse(response);
      });
    return true; // 非同期レスポンスを示すためにtrueを返す
  }
  
  // テスト翻訳リクエストの処理
  if (message.action === 'testTranslate') {
    console.log('ポップアップからのテスト翻訳リクエストを受信:', message);
    testTranslate(message.text, message.settings)
      .then(response => {
        console.log('テスト翻訳結果:', response);
        sendResponse(response);
      });
    return true;
  }
  
  // APIキー検証リクエストの処理
  if (message.action === 'verifyOpenRouterApiKey' || 
      message.action === 'verifyAnthropicApiKey' || 
      message.action === 'verifyGeminiApiKey') {
    
    const provider = message.action.replace('verify', '').replace('ApiKey', '').toLowerCase();
    console.log(`${provider} APIキー検証リクエストを受信`);
    
    loadSettings()
      .then(settings => {
        // 一時的な設定オブジェクトを作成
        const tempSettings = { ...settings };
        tempSettings[`${provider}ApiKey`] = message.apiKey;
        
        const apiClient = createSpecificApiClient(tempSettings, provider);
        return apiClient.verifyApiKey();
      })
      .then(result => {
        console.log(`${provider} APIキー検証結果:`, result);
        sendResponse({ result });
      })
      .catch(error => {
        console.error(`${provider} APIキー検証エラー:`, error);
        sendResponse({ 
          error: { 
            message: error.message, 
            details: error.stack || '' 
          } 
        });
      });
    
    return true;
  }
  
  // モデル一覧取得リクエストの処理
  if (message.action === 'getOpenRouterModels' || 
      message.action === 'getAnthropicModels' || 
      message.action === 'getGeminiModels') {
    
    const provider = message.action.replace('get', '').replace('Models', '').toLowerCase();
    console.log(`${provider} モデル一覧リクエストを受信`);
    
    loadSettings()
      .then(settings => {
        // 一時的な設定オブジェクトを作成
        const tempSettings = { ...settings };
        if (message.apiKey) {
          tempSettings[`${provider}ApiKey`] = message.apiKey;
        }
        
        const apiClient = createSpecificApiClient(tempSettings, provider);
        return apiClient.getModels();
      })
      .then(models => {
        console.log(`${provider} モデル一覧:`, models);
        sendResponse({ models });
      })
      .catch(error => {
        console.error(`${provider} モデル一覧取得エラー:`, error);
        sendResponse({ 
          error: { 
            message: error.message, 
            details: error.stack || '' 
          } 
        });
      });
    
    return true;
  }
  
  // 中間サーバー接続テストリクエストの処理
  if (message.action === 'testProxyServer') {
    console.log('中間サーバー接続テストリクエストを受信:', message);
    
    const proxyUrl = `${message.proxyServerUrl}/health`;
    
    fetch(proxyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('中間サーバー接続テスト成功:', data);
        sendResponse({ 
          success: true, 
          message: '中間サーバーに正常に接続できました', 
          data 
        });
      })
      .catch(error => {
        console.error('中間サーバー接続テストエラー:', error);
        sendResponse({ 
          success: false, 
          message: `中間サーバーに接続できませんでした: ${error.message}` 
        });
      });
    
    return true;
  }
});