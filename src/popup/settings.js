import { showStatus } from './ui.js';
import { fetchModels, populateModelSelect } from './models.js';

// 設定の読み込み
function loadSettings({ 
  apiProviderSelect, 
  openrouterApiKeyInput, 
  openrouterModelSelect, 
  geminiApiKeyInput, 
  geminiModelSelect, 
  anthropicApiKeyInput, 
  anthropicModelSelect, 
  openrouterSection, 
  geminiSection, 
  anthropicSection,
  proxyServerUrlInput,
  useProxyServerCheckbox
}) {
  chrome.storage.sync.get(
    {
      apiProvider: 'openrouter',
      openrouterApiKey: '',
      openrouterModel: 'openai/gpt-4o-mini',
      geminiApiKey: '',
      geminiModel: 'gemini-2.0-flash',
      anthropicApiKey: '',
      anthropicModel: 'claude-3-5-sonnet-20240620',
      proxyServerUrl: 'http://localhost:3000',
      useProxyServer: false
    },
    settings => {
      apiProviderSelect.value = settings.apiProvider;
      openrouterApiKeyInput.value = settings.openrouterApiKey;
      openrouterModelSelect.value = settings.openrouterModel;
      geminiApiKeyInput.value = settings.geminiApiKey;
      geminiModelSelect.value = settings.geminiModel;
      anthropicApiKeyInput.value = settings.anthropicApiKey;
      proxyServerUrlInput.value = settings.proxyServerUrl;
      useProxyServerCheckbox.checked = settings.useProxyServer;
      
      // APIプロバイダーに応じたセクションの表示制御
      const sections = {
        openrouter: openrouterSection,
        gemini: geminiSection,
        anthropic: anthropicSection
      };
      
      // すべてのセクションを非表示にする
      Object.values(sections).forEach(section => section.classList.add('hidden'));
      
      // 選択されたプロバイダーのセクションを表示する
      sections[settings.apiProvider].classList.remove('hidden');
      
      // モデルの選択状態は、モデル一覧が取得された後に設定される
      const restoreModelSelection = (provider, modelSelect, modelValue) => {
        if (modelValue) {
          setTimeout(() => {
            if (Array.from(modelSelect.options).some(opt => opt.value === modelValue)) {
              modelSelect.value = modelValue;
              
              // Select2の更新
              if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
                $(modelSelect).trigger('change');
                
                // モデル情報を更新
                const modelData = $(modelSelect).find(`option[value="${modelValue}"]`).data('model');
                if (modelData) {
                  updateModelInfo(provider, modelData);
                }
              }
            }
          }, 500); // モデル一覧の読み込み完了を待つための遅延
        }
      };
      
      restoreModelSelection('openrouter', openrouterModelSelect, settings.openrouterModel);
      restoreModelSelection('anthropic', anthropicModelSelect, settings.anthropicModel);
    }
  );
}

// 設定の保存
function saveSettings({ apiProviderSelect, openrouterApiKeyInput, openrouterModelSelect, geminiApiKeyInput, geminiModelSelect, anthropicApiKeyInput, anthropicModelSelect, statusMessage }) {
  const settings = {
    apiProvider: apiProviderSelect.value,
    openrouterApiKey: openrouterApiKeyInput.value.trim(),
    openrouterModel: openrouterModelSelect.value,
    geminiApiKey: geminiApiKeyInput.value.trim(),
    geminiModel: geminiModelSelect.value,
    anthropicApiKey: anthropicApiKeyInput.value.trim(),
    anthropicModel: anthropicModelSelect.value
  };

  let isValid = true;
  let errorMessage = '';
  
  if (settings.apiProvider === 'openrouter' && !settings.openrouterApiKey) {
    isValid = false;
    errorMessage = 'OpenRouter APIキーを入力してください';
  } else if (settings.apiProvider === 'gemini' && !settings.geminiApiKey) {
    isValid = false;
    errorMessage = 'Gemini APIキーを入力してください';
  } else if (settings.apiProvider === 'anthropic' && !settings.anthropicApiKey) {
    isValid = false;
    errorMessage = 'Anthropic APIキーを入力してください';
  }
  
  if (!isValid) {
    showStatus(statusMessage, errorMessage, false);
    return;
  }
  
  chrome.storage.sync.set(settings, () => {
    showStatus(statusMessage, '設定を保存しました', true);
  });
}

// 詳細設定の保存
function saveAdvancedSettings(elements) {
  const { proxyServerUrlInput, useProxyServerCheckbox, proxyStatus } = elements;
  const proxyServerUrl = proxyServerUrlInput.value.trim();
  const useProxyServer = useProxyServerCheckbox.checked;
  
  chrome.storage.sync.set({ 
    proxyServerUrl,
    useProxyServer
  }, () => {
    showStatus(proxyStatus, '詳細設定を保存しました', true);
  });
}

// 中間サーバー接続テスト
async function testProxyServer(elements) {
  const { proxyServerUrlInput, proxyStatus } = elements;
  const proxyUrl = proxyServerUrlInput.value.trim();
  
  if (!proxyUrl) {
    showStatus(proxyStatus, '中間サーバーURLを入力してください', false);
    return;
  }
  
  showStatus(proxyStatus, '接続テスト中...', true);
  
  try {
    const response = await fetch(`${proxyUrl}/health`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok') {
        showStatus(proxyStatus, '✓ 中間サーバーに接続できました', true);
      } else {
        showStatus(proxyStatus, `✗ 中間サーバーからの応答が不正: ${JSON.stringify(data)}`, false);
      }
    } else {
      showStatus(proxyStatus, `✗ 中間サーバーに接続できません: ${response.status} ${response.statusText}`, false);
    }
  } catch (error) {
    console.error('中間サーバー接続テストエラー:', error);
    showStatus(proxyStatus, `✗ 中間サーバーに接続できません: ${error.message}`, false);
  }
}

// APIキー検証処理
async function verifyApiKey(provider, apiKey, statusElem, buttonElem) {
  if (!apiKey) {
    statusElem.textContent = 'APIキーを入力してください';
    statusElem.style.color = '#d32f2f';
    return;
  }
  buttonElem.disabled = true;
  statusElem.textContent = '検証中...';
  statusElem.style.color = '#666';

  try {
    // 直接APIにアクセス
    let url, headers;
    
    if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/models';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'chrome-extension://llm-translator',
        'X-Title': 'LLM Translation Plugin'
      };
    } else if (provider === 'anthropic') {
      url = 'https://api.anthropic.com/v1/models';
      headers = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`${provider} モデル一覧:`, data);
      statusElem.textContent = '✓ APIキーは有効です';
      statusElem.style.color = '#155724';
      
      // モデル一覧を更新
      const elements = getElements();
      const modelSelect = elements[`${provider}ModelSelect`];
      const models = provider === 'openrouter' ? data.data || [] : data.models || [];
      populateModelSelect(provider, modelSelect, models);
    } else {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error(`${provider} APIキー検証エラー:`, errorData);
      statusElem.textContent = `✗ APIキーが無効: ${errorData.error?.message || response.statusText}`;
      statusElem.style.color = '#d32f2f';
    }
  } catch (error) {
    console.error('APIキー検証中にエラー:', error);
    try {
      await verifyApiKeyViaBackground(provider, apiKey);
      statusElem.textContent = '✓ APIキーは有効です (バックグラウンド経由)';
      statusElem.style.color = '#155724';
      
      // モデル一覧を更新
      const models = await fetchModelsViaBackground(provider, apiKey);
      const elements = getElements();
      const modelSelect = elements[`${provider}ModelSelect`];
      populateModelSelect(provider, modelSelect, models);
    } catch (bgError) {
      console.error('バックグラウンド経由検証エラー:', bgError);
      statusElem.textContent = `✗ APIキー検証失敗: ${bgError.message || 'ネットワークエラー'}`;
      statusElem.style.color = '#d32f2f';
    }
  } finally {
    buttonElem.disabled = false;
  }
}

// バックグラウンド経由でAPIキーを検証
function verifyApiKeyViaBackground(provider, apiKey) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: `verify${provider.charAt(0).toUpperCase() + provider.slice(1)}ApiKey`,
        apiKey: apiKey
      },
      response => {
        if (chrome.runtime.lastError) {
          return reject(new Error(`バックグラウンドスクリプトエラー: ${chrome.runtime.lastError.message}`));
        }
        if (response.error) {
          return reject(new Error(response.error.message || 'APIキー検証エラー'));
        }
        resolve(response.result);
      }
    );
  });
}

// getElements関数の参照を追加
import { getElements } from './ui.js';
import { updateModelInfo } from './models.js';

export { 
  loadSettings, 
  saveSettings, 
  saveAdvancedSettings, 
  testProxyServer, 
  verifyApiKey, 
  verifyApiKeyViaBackground 
};