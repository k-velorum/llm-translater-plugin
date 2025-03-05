import { 
  getElements, 
  initTabs, 
  setupApiProviderToggle, 
  createVerificationUI 
} from './ui.js';
import { 
  loadSettings, 
  saveSettings, 
  saveAdvancedSettings, 
  testProxyServer 
} from './settings.js';
import { 
  initSelect2, 
  loadModels 
} from './models.js';
import { 
  testApi 
} from './api-test.js';

document.addEventListener('DOMContentLoaded', init);

function init() {
  const elements = getElements();
  initTabs(elements);
  setupApiProviderToggle(elements);
  createVerificationUI(elements);
  loadSettings(elements);
  bindEventHandlers(elements);
  initSelect2(elements);
  loadModels(elements);
}

function bindEventHandlers(elements) {
  const { 
    saveButton, 
    testButton, 
    anthropicApiKeyInput, 
    anthropicModelSelect,
    openrouterApiKeyInput,
    openrouterModelSelect,
    testProxyButton,
    saveAdvancedButton
  } = elements;
  
  saveButton.addEventListener('click', () => saveSettings(elements));
  testButton.addEventListener('click', () => testApi(elements));
  
  // 詳細設定の保存ボタン
  saveAdvancedButton.addEventListener('click', () => saveAdvancedSettings(elements));
  
  // 中間サーバー接続テストボタン
  testProxyButton.addEventListener('click', () => testProxyServer(elements));
  
  // APIキーが変更されたときにモデル一覧を更新
  const apiKeyChangeHandler = async (provider, apiKeyInput, modelSelect) => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      try {
        const models = await fetchModels(provider, apiKey);
        populateModelSelect(provider, modelSelect, models);
      } catch (error) {
        console.error('APIキー変更時のモデル一覧取得エラー:', error);
      }
    }
  };
  
  anthropicApiKeyInput.addEventListener('change', () => 
    apiKeyChangeHandler('anthropic', anthropicApiKeyInput, anthropicModelSelect));
  
  openrouterApiKeyInput.addEventListener('change', () => 
    apiKeyChangeHandler('openrouter', openrouterApiKeyInput, openrouterModelSelect));
}

// fetchModelsとpopulateModelSelectの参照を追加
import { fetchModels, populateModelSelect } from './models.js';