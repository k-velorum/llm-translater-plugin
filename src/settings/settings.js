/**
 * 設定管理モジュール
 */

// デフォルト設定
const DEFAULT_SETTINGS = {
  apiProvider: 'openrouter',
  openrouterApiKey: '',
  openrouterModel: 'openai/gpt-4o-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-flash-2.0',
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-haiku-20241022',
  proxyServerUrl: 'http://localhost:3000',
  useProxyServer: false
};

/**
 * 設定を読み込む
 * @returns {Promise<Object>} - 設定オブジェクト
 */
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      resolve(settings);
    });
  });
}

/**
 * 設定を保存する
 * @param {Object} settings - 保存する設定
 * @returns {Promise<void>}
 */
function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve();
    });
  });
}

/**
 * 特定のプロバイダーのAPIキーを取得
 * @param {Object} settings - 設定オブジェクト
 * @param {string} provider - プロバイダー名
 * @returns {string} - APIキー
 */
function getApiKey(settings, provider) {
  switch (provider) {
    case 'openrouter':
      return settings.openrouterApiKey;
    case 'gemini':
      return settings.geminiApiKey;
    case 'anthropic':
      return settings.anthropicApiKey;
    default:
      return '';
  }
}

/**
 * 特定のプロバイダーのモデル名を取得
 * @param {Object} settings - 設定オブジェクト
 * @param {string} provider - プロバイダー名
 * @returns {string} - モデル名
 */
function getModel(settings, provider) {
  switch (provider) {
    case 'openrouter':
      return settings.openrouterModel;
    case 'gemini':
      return settings.geminiModel;
    case 'anthropic':
      return settings.anthropicModel;
    default:
      return '';
  }
}

export { DEFAULT_SETTINGS, loadSettings, saveSettings, getApiKey, getModel };