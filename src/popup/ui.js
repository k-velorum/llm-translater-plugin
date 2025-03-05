// UI要素の取得
function getElements() {
  return {
    // 設定用フォーム要素
    apiProviderSelect: document.getElementById('api-provider'),
    openrouterSection: document.getElementById('openrouter-section'),
    geminiSection: document.getElementById('gemini-section'),
    anthropicSection: document.getElementById('anthropic-section'),
    openrouterApiKeyInput: document.getElementById('openrouter-api-key'),
    openrouterModelSelect: document.getElementById('openrouter-model'),
    geminiApiKeyInput: document.getElementById('gemini-api-key'),
    geminiModelSelect: document.getElementById('gemini-model'),
    anthropicApiKeyInput: document.getElementById('anthropic-api-key'),
    anthropicModelSelect: document.getElementById('anthropic-model'),
    saveButton: document.getElementById('save-button'),
    statusMessage: document.getElementById('status-message'),
    // テスト用要素
    testApiProviderSelect: document.getElementById('test-api-provider'),
    testTextArea: document.getElementById('test-text'),
    testButton: document.getElementById('test-button'),
    testStatus: document.getElementById('test-status'),
    testResult: document.getElementById('test-result'),
    // 詳細設定用要素
    proxyServerUrlInput: document.getElementById('proxy-server-url'),
    useProxyServerCheckbox: document.getElementById('use-proxy-server'),
    testProxyButton: document.getElementById('test-proxy-button'),
    proxyStatus: document.getElementById('proxy-status'),
    saveAdvancedButton: document.getElementById('save-advanced-button'),
    // タブ用要素
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content')
  };
}

// タブの初期化
function initTabs({ tabs, tabContents }) {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
      });
    });
  });
}

// APIプロバイダー切り替えの設定
function setupApiProviderToggle({ apiProviderSelect, openrouterSection, geminiSection, anthropicSection }) {
  apiProviderSelect.addEventListener('change', () => {
    const sections = {
      openrouter: openrouterSection,
      gemini: geminiSection,
      anthropic: anthropicSection
    };
    
    // すべてのセクションを非表示にする
    Object.values(sections).forEach(section => section.classList.add('hidden'));
    
    // 選択されたプロバイダーのセクションを表示する
    sections[apiProviderSelect.value].classList.remove('hidden');
  });
}

// ステータスメッセージの表示
function showStatus(element, message, isSuccess) {
  element.textContent = message;
  element.classList.remove('hidden', 'success', 'error');
  element.classList.add(isSuccess ? 'success' : 'error');
  if (isSuccess) {
    setTimeout(() => element.classList.add('hidden'), 3000);
  }
}

// APIキー検証UI作成の共通関数
function createProviderVerificationUI(provider, apiKeyInput) {
  const container = document.createElement('div');
  container.style.marginTop = '10px';
  container.style.display = 'flex';
  container.style.justifyContent = 'space-between';
  container.style.alignItems = 'center';

  const keyStatus = document.createElement('span');
  keyStatus.style.fontSize = '12px';
  keyStatus.style.color = '#666';
  keyStatus.textContent = '';

  const verifyButton = document.createElement('button');
  verifyButton.textContent = 'APIキーを検証';
  verifyButton.style.padding = '5px 10px';
  verifyButton.style.fontSize = '12px';
  verifyButton.style.backgroundColor = '#34a853';
  verifyButton.style.width = 'auto';

  verifyButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const elements = getElements();
    const modelSelect = elements[`${provider}ModelSelect`];
    
    await verifyApiKey(provider, apiKey, keyStatus, verifyButton);
    
    // APIキー検証が成功したら、そのAPIキーでモデル一覧も更新
    if (keyStatus.textContent.includes('✓')) {
      try {
        const models = await fetchModels(provider, apiKey);
        populateModelSelect(provider, modelSelect, models);
      } catch (error) {
        console.error('モデル一覧の更新に失敗:', error);
      }
    }
  });

  container.appendChild(keyStatus);
  container.appendChild(verifyButton);
  apiKeyInput.parentNode.appendChild(container);
}

// 検証UI作成
function createVerificationUI(elements) {
  createProviderVerificationUI('openrouter', elements.openrouterApiKeyInput);
  createProviderVerificationUI('anthropic', elements.anthropicApiKeyInput);
}

export { 
  getElements, 
  initTabs, 
  setupApiProviderToggle, 
  showStatus, 
  createVerificationUI,
  createProviderVerificationUI
};