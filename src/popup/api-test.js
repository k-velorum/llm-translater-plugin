import { showStatus } from './ui.js';

// APIテスト処理（実際の翻訳処理を利用）
function testApi(elements) {
  const { testApiProviderSelect, testTextArea, testButton, testStatus, testResult, useProxyServerCheckbox } = elements;
  const apiProvider = testApiProviderSelect.value;
  const testText = testTextArea.value.trim();
  if (!testText) {
    showStatus(testStatus, 'テスト文章を入力してください', false);
    return;
  }
  chrome.storage.sync.get(
    {
      openrouterApiKey: '',
      openrouterModel: 'openai/gpt-4o-mini',
      geminiApiKey: '',
      geminiModel: 'gemini-2.0-flash',
      anthropicApiKey: '',
      anthropicModel: 'claude-3-5-sonnet-20240620',
      proxyServerUrl: 'http://localhost:3000',
      useProxyServer: false
    },
    async settings => {
      let providerSettings;
      if (apiProvider === 'openrouter') {
        if (!settings.openrouterApiKey) {
          showStatus(testStatus, 'OpenRouter APIキーが設定されていません', false);
          testButton.disabled = false;
          return;
        }
        providerSettings = {
          apiProvider: 'openrouter',
          openrouterApiKey: settings.openrouterApiKey,
          openrouterModel: settings.openrouterModel,
          proxyServerUrl: settings.proxyServerUrl,
          useProxyServer: settings.useProxyServer
        };
      } else if (apiProvider === 'gemini') {
        if (!settings.geminiApiKey) {
          showStatus(testStatus, 'Gemini APIキーが設定されていません', false);
          testButton.disabled = false;
          return;
        }
        providerSettings = {
          apiProvider: 'gemini',
          geminiApiKey: settings.geminiApiKey,
          geminiModel: settings.geminiModel
        };
      } else if (apiProvider === 'anthropic') {
        if (!settings.anthropicApiKey) {
          showStatus(testStatus, 'Anthropic APIキーが設定されていません', false);
          testButton.disabled = false;
          return;
        }
        providerSettings = {
          apiProvider: 'anthropic',
          anthropicApiKey: settings.anthropicApiKey,
          anthropicModel: settings.anthropicModel,
          proxyServerUrl: settings.proxyServerUrl,
          useProxyServer: settings.useProxyServer
        };
      }
      
      try {
        testButton.disabled = true;
        showStatus(testStatus, 'テスト中...', true);
        testResult.classList.add('hidden');
        chrome.runtime.sendMessage(
          {
            action: 'testTranslate',
            text: testText,
            settings: providerSettings
          },
          response => {
            if (chrome.runtime.lastError) {
              showStatus(testStatus, `エラー: ${chrome.runtime.lastError.message}`, false);
              testResult.textContent = '';
              testResult.classList.remove('hidden');
            } else if (response.error) {
              showStatus(testStatus, `エラー: ${response.error.message}`, false);
              testResult.textContent = response.error.details || '';
              testResult.classList.remove('hidden');
            } else {
              showStatus(testStatus, 'テスト成功！', true);
              testResult.textContent = response.result;
              testResult.classList.remove('hidden');
            }
            testButton.disabled = false;
          }
        );
      } catch (error) {
        console.error('APIテストエラー:', error);
        showStatus(testStatus, `エラー: ${error.message}`, false);
        testResult.textContent = error.stack || 'スタックトレース情報なし';
        testResult.classList.remove('hidden');
        testButton.disabled = false;
      }
    }
  );
}

export { testApi };