// 共有デフォルト設定（全コンポーネントの単一ソース）
export const DEFAULT_SETTINGS = {
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

// 設定の読み込み
export function loadSettings() {
  return new Promise((resolve) => {
    // chrome.storage.sync.get の第一引数にデフォルト値を渡すことで、
    // 保存されていないキーに対してもデフォルト値が適用されたオブジェクトを取得できる
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      resolve(settings);
    });
  });
}

// 設定の保存 (popup.js でのみ使用されているが、一元管理のためにここに置くことも検討可能)
// export function saveSettings(settingsToSave) {
//   return new Promise((resolve, reject) => {
//     chrome.storage.sync.set(settingsToSave, () => {
//       if (chrome.runtime.lastError) {
//         return reject(chrome.runtime.lastError);
//       }
//       resolve();
//     });
//   });
// }

// デフォルト設定の初期化 (onInstalled イベントリスナー内で使用)
export function initializeDefaultSettings() {
  // 既存の設定を尊重しつつ、未設定の項目にデフォルト値を設定する
  chrome.storage.sync.get(null, (existingSettings) => {
     const mergedSettings = { ...DEFAULT_SETTINGS, ...existingSettings };
     chrome.storage.sync.set(mergedSettings, () => {
       if (chrome.runtime.lastError) {
         console.error('デフォルト設定の保存中にエラー:', chrome.runtime.lastError);
       } else {
         console.log('デフォルト設定が初期化/更新されました:', mergedSettings);
       }
     });
  });
}
