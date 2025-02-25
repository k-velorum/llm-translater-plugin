document.addEventListener('DOMContentLoaded', init);

function init() {
  const elements = getElements();
  initTabs(elements);
  setupApiProviderToggle(elements);
  createVerificationUI(elements);
  loadSettings(elements);
  bindEventHandlers(elements);
  initSelect2(elements);
  loadAnthropicModels(elements);
  loadOpenRouterModels(elements);
}

// Select2の初期化
function initSelect2(elements) {
  // jQueryが読み込まれているか確認
  if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
    $('.model-select').select2({
      placeholder: 'モデルを選択',
      allowClear: true,
      width: '100%',
      templateResult: formatModelOption
    });
    
    // モデル選択時の処理
    $('#openrouter-model').on('select2:select', function(e) {
      const modelId = e.params.data.id;
      const modelData = $(this).find(`option[value="${modelId}"]`).data('model');
      if (modelData) {
        updateModelInfo('openrouter', modelData);
      }
    });
    
    $('#anthropic-model').on('select2:select', function(e) {
      const modelId = e.params.data.id;
      const modelData = $(this).find(`option[value="${modelId}"]`).data('model');
      if (modelData) {
        updateModelInfo('anthropic', modelData);
      }
    });
  } else {
    console.error('Select2またはjQueryが読み込まれていません');
  }
}

// モデルオプションの表示形式をカスタマイズ
function formatModelOption(model) {
  if (!model.id) {
    return model.text;
  }
  
  const $option = $(model.element);
  const modelData = $option.data('model');
  
  if (!modelData) {
    return model.text;
  }
  
  // OpenRouterモデルの場合
  if (modelData.id && modelData.name) {
    let $result = $('<div class="model-option"></div>');
    let $name = $('<div class="model-name"></div>').text(modelData.name);
    
    $result.append($name)
    return $result;
  }
  
  return model.text;
}

// モデル情報の表示を更新
function updateModelInfo(provider, modelData) {
  const infoElement = document.getElementById(`${provider}-model-info`);
  if (!infoElement || !modelData) return;
  
  let infoText = '';
  
  if (provider === 'openrouter') {
    infoText = `モデル: ${modelData.name}`;
    if (modelData.context_length) {
      infoText += `<br>コンテキスト長: ${modelData.context_length}`;
    }
    if (modelData.pricing && modelData.pricing.prompt) {
      infoText += `<br>入力料金: $${modelData.pricing.prompt} / 1M tokens`;
    }
    if (modelData.pricing && modelData.pricing.completion) {
      infoText += `<br>出力料金: $${modelData.pricing.completion} / 1M tokens`;
    }
  } else if (provider === 'anthropic') {
    infoText = `モデル: ${modelData.name || modelData.id}`;
    if (modelData.context_window) {
      infoText += `<br>コンテキスト長: ${modelData.context_window}`;
    }
    if (modelData.description) {
      infoText += `<br>${modelData.description}`;
    }
  }
  
  infoElement.innerHTML = infoText;
}

// OpenRouterモデル一覧の取得と設定
async function loadOpenRouterModels(elements) {
  const { openrouterModelSelect, openrouterApiKeyInput } = elements;
  
  // 保存されているAPIキーを取得
  chrome.storage.sync.get(['openrouterApiKey'], async (settings) => {
    if (settings.openrouterApiKey) {
      try {
        const models = await fetchOpenRouterModels(settings.openrouterApiKey);
        populateOpenRouterModelSelect(openrouterModelSelect, models);
      } catch (error) {
        console.error('OpenRouterモデル一覧の取得に失敗:', error);
        // エラー時はデフォルトモデルを設定
        setDefaultOpenRouterModels(openrouterModelSelect);
      }
    } else {
      // APIキーがない場合はデフォルトモデルを設定
      setDefaultOpenRouterModels(openrouterModelSelect);
      
      // APIキーがない場合でも、公開APIからモデル一覧を取得
      try {
        const models = await fetchOpenRouterModels();
        populateOpenRouterModelSelect(openrouterModelSelect, models);
      } catch (error) {
        console.error('公開APIからのOpenRouterモデル一覧の取得に失敗:', error);
      }
    }
  });
}

// OpenRouterのAPIからモデル一覧を取得
async function fetchOpenRouterModels(apiKey) {
  try {
    // 直接フェッチ試行
    const headers = {
      'HTTP-Referer': 'chrome-extension://llm-translator',
      'X-Title': 'LLM Translation Plugin'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: headers
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    
    // 直接フェッチが失敗した場合、バックグラウンド経由で試行
    return await fetchOpenRouterModelsViaBackground(apiKey);
  } catch (error) {
    console.error('OpenRouterモデル取得エラー:', error);
    return await fetchOpenRouterModelsViaBackground(apiKey);
  }
}

// バックグラウンド経由でOpenRouterモデル一覧を取得
function fetchOpenRouterModelsViaBackground(apiKey) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'getOpenRouterModels',
        apiKey: apiKey
      },
      response => {
        if (chrome.runtime.lastError) {
          return reject(new Error(`バックグラウンドスクリプトエラー: ${chrome.runtime.lastError.message}`));
        }
        if (response.error) {
          return reject(new Error(response.error.message || 'モデル取得エラー'));
        }
        resolve(response.models || []);
      }
    );
  });
}

// OpenRouterモデル選択要素にモデル一覧をセット
function populateOpenRouterModelSelect(selectElement, models) {
  // 現在選択されているモデルを保存
  const selectedModel = selectElement.value;
  
  // 既存のオプションをクリア
  selectElement.innerHTML = '';
  
  if (models && models.length > 0) {
    // 取得したモデルでオプションを生成
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.name} (${model.id})`;
      
      // モデルデータをdata属性に保存
      $(option).data('model', model);
      
      selectElement.appendChild(option);
    });
    
    // 前回選択していたモデルがあれば選択状態を復元
    if (selectedModel && Array.from(selectElement.options).some(opt => opt.value === selectedModel)) {
      selectElement.value = selectedModel;
      
      // Select2の更新
      if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
        $(selectElement).trigger('change');
        
        // モデル情報を更新
        const modelData = $(selectElement).find(`option[value="${selectedModel}"]`).data('model');
        if (modelData) {
          updateModelInfo('openrouter', modelData);
        }
      }
    }
  } else {
    // モデルが取得できない場合はデフォルトモデルをセット
    setDefaultOpenRouterModels(selectElement);
  }
}

// デフォルトのOpenRouterモデルをセット
function setDefaultOpenRouterModels(selectElement) {
  const defaultModels = [
    { id: 'openai/gpt-4o-mini', name: 'GPT 4o mini' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
    { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' }
  ];
  
  // 現在選択されているモデルを保存
  const selectedModel = selectElement.value;
  
  // 既存のオプションをクリア
  selectElement.innerHTML = '';
  
  // デフォルトモデルでオプションを生成
  defaultModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name;
    
    // モデルデータをdata属性に保存
    $(option).data('model', model);
    
    selectElement.appendChild(option);
  });
  
  // 前回選択していたモデルがあれば選択状態を復元
  if (selectedModel && Array.from(selectElement.options).some(opt => opt.value === selectedModel)) {
    selectElement.value = selectedModel;
    
    // Select2の更新
    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
      $(selectElement).trigger('change');
    }
  }
}

// Anthropicモデル一覧の取得と設定
async function loadAnthropicModels(elements) {
  const { anthropicModelSelect, anthropicApiKeyInput } = elements;
  
  // 保存されているAPIキーを取得
  chrome.storage.sync.get(['anthropicApiKey'], async (settings) => {
    if (settings.anthropicApiKey) {
      try {
        const models = await fetchAnthropicModels(settings.anthropicApiKey);
        populateAnthropicModelSelect(anthropicModelSelect, models);
      } catch (error) {
        console.error('Anthropicモデル一覧の取得に失敗:', error);
        // エラー時はデフォルトモデルを設定
        setDefaultAnthropicModels(anthropicModelSelect);
      }
    } else {
      // APIキーがない場合はデフォルトモデルを設定
      setDefaultAnthropicModels(anthropicModelSelect);
    }
  });
}

// AnthropicのAPIからモデル一覧を取得
async function fetchAnthropicModels(apiKey) {
  try {
    // 直接フェッチ試行
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.models || [];
    }
    
    // 直接フェッチが失敗した場合、バックグラウンド経由で試行
    return await fetchAnthropicModelsViaBackground(apiKey);
  } catch (error) {
    console.error('Anthropicモデル取得エラー:', error);
    return await fetchAnthropicModelsViaBackground(apiKey);
  }
}

// バックグラウンド経由でAnthropicモデル一覧を取得
function fetchAnthropicModelsViaBackground(apiKey) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'getAnthropicModels',
        apiKey: apiKey
      },
      response => {
        if (chrome.runtime.lastError) {
          return reject(new Error(`バックグラウンドスクリプトエラー: ${chrome.runtime.lastError.message}`));
        }
        if (response.error) {
          return reject(new Error(response.error.message || 'モデル取得エラー'));
        }
        resolve(response.models || []);
      }
    );
  });
}

// Anthropicモデル選択要素にモデル一覧をセット
function populateAnthropicModelSelect(selectElement, models) {
  // 現在選択されているモデルを保存
  const selectedModel = selectElement.value;
  
  // 既存のオプションをクリア
  selectElement.innerHTML = '';
  
  if (models && models.length > 0) {
    // 取得したモデルでオプションを生成
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.name} (${model.id})`;
      
      // モデルデータをdata属性に保存
      $(option).data('model', model);
      
      selectElement.appendChild(option);
    });
    
    // 前回選択していたモデルがあれば選択状態を復元
    if (selectedModel && Array.from(selectElement.options).some(opt => opt.value === selectedModel)) {
      selectElement.value = selectedModel;
      
      // Select2の更新
      if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
        $(selectElement).trigger('change');
        
        // モデル情報を更新
        const modelData = $(selectElement).find(`option[value="${selectedModel}"]`).data('model');
        if (modelData) {
          updateModelInfo('anthropic', modelData);
        }
      }
    }
  } else {
    // モデルが取得できない場合はデフォルトモデルをセット
    setDefaultAnthropicModels(selectElement);
  }
}

// デフォルトのAnthropicモデルをセット
function setDefaultAnthropicModels(selectElement) {
  const defaultModels = [
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
  ];
  
  // 現在選択されているモデルを保存
  const selectedModel = selectElement.value;
  
  // 既存のオプションをクリア
  selectElement.innerHTML = '';
  
  // デフォルトモデルでオプションを生成
  defaultModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name;
    
    // モデルデータをdata属性に保存
    $(option).data('model', model);
    
    selectElement.appendChild(option);
  });
  
  // 前回選択していたモデルがあれば選択状態を復元
  if (selectedModel && Array.from(selectElement.options).some(opt => opt.value === selectedModel)) {
    selectElement.value = selectedModel;
    
    // Select2の更新
    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
      $(selectElement).trigger('change');
    }
  }
}function getElements() {
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

function setupApiProviderToggle({ apiProviderSelect, openrouterSection, geminiSection, anthropicSection }) {
  apiProviderSelect.addEventListener('change', () => {
    if (apiProviderSelect.value === 'openrouter') {
      openrouterSection.classList.remove('hidden');
      geminiSection.classList.add('hidden');
      anthropicSection.classList.add('hidden');
    } else if (apiProviderSelect.value === 'gemini') {
      openrouterSection.classList.add('hidden');
      geminiSection.classList.remove('hidden');
      anthropicSection.classList.add('hidden');
    } else if (apiProviderSelect.value === 'anthropic') {
      openrouterSection.classList.add('hidden');
      geminiSection.classList.add('hidden');
      anthropicSection.classList.remove('hidden');
    }
  });
}

function createVerificationUI({ openrouterApiKeyInput, anthropicApiKeyInput }) {
  // OpenRouter API検証UI
  const openrouterContainer = document.createElement('div');
  openrouterContainer.style.marginTop = '10px';
  openrouterContainer.style.display = 'flex';
  openrouterContainer.style.justifyContent = 'space-between';
  openrouterContainer.style.alignItems = 'center';

  const openrouterKeyStatus = document.createElement('span');
  openrouterKeyStatus.style.fontSize = '12px';
  openrouterKeyStatus.style.color = '#666';
  openrouterKeyStatus.textContent = '';

  const verifyOpenrouterButton = document.createElement('button');
  verifyOpenrouterButton.textContent = 'APIキーを検証';
  verifyOpenrouterButton.style.padding = '5px 10px';
  verifyOpenrouterButton.style.fontSize = '12px';
  verifyOpenrouterButton.style.backgroundColor = '#34a853';
  verifyOpenrouterButton.style.width = 'auto';

  verifyOpenrouterButton.addEventListener('click', () => {
    const apiKey = openrouterApiKeyInput.value.trim();
    verifyOpenRouterApiKey(apiKey, openrouterKeyStatus, verifyOpenrouterButton);
  });

  openrouterContainer.appendChild(openrouterKeyStatus);
  openrouterContainer.appendChild(verifyOpenrouterButton);
  openrouterApiKeyInput.parentNode.appendChild(openrouterContainer);
  
  // Anthropic API検証UI
  const anthropicContainer = document.createElement('div');
  anthropicContainer.style.marginTop = '10px';
  anthropicContainer.style.display = 'flex';
  anthropicContainer.style.justifyContent = 'space-between';
  anthropicContainer.style.alignItems = 'center';

  const anthropicKeyStatus = document.createElement('span');
  anthropicKeyStatus.style.fontSize = '12px';
  anthropicKeyStatus.style.color = '#666';
  anthropicKeyStatus.textContent = '';

  const verifyAnthropicButton = document.createElement('button');
  verifyAnthropicButton.textContent = 'APIキーを検証';
  verifyAnthropicButton.style.padding = '5px 10px';
  verifyAnthropicButton.style.fontSize = '12px';
  verifyAnthropicButton.style.backgroundColor = '#34a853';
  verifyAnthropicButton.style.width = 'auto';

  verifyAnthropicButton.addEventListener('click', async () => {
    const apiKey = anthropicApiKeyInput.value.trim();
    const { anthropicModelSelect } = getElements();
    
    await verifyAnthropicApiKey(apiKey, anthropicKeyStatus, verifyAnthropicButton);
    
    // APIキー検証が成功したら、そのAPIキーでモデル一覧も更新
    if (anthropicKeyStatus.textContent.includes('✓')) {
      try {
        const models = await fetchAnthropicModels(apiKey);
        populateAnthropicModelSelect(anthropicModelSelect, models);
      } catch (error) {
        console.error('モデル一覧の更新に失敗:', error);
      }
    }
  });

  anthropicContainer.appendChild(anthropicKeyStatus);
  anthropicContainer.appendChild(verifyAnthropicButton);
  anthropicApiKeyInput.parentNode.appendChild(anthropicContainer);
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
  
  // Anthropic APIキーが変更されたときにモデル一覧を更新
  anthropicApiKeyInput.addEventListener('change', async () => {
    const apiKey = anthropicApiKeyInput.value.trim();
    if (apiKey) {
      try {
        const models = await fetchAnthropicModels(apiKey);
        populateAnthropicModelSelect(anthropicModelSelect, models);
      } catch (error) {
        console.error('APIキー変更時のモデル一覧取得エラー:', error);
      }
    }
  });
  
  // OpenRouter APIキーが変更されたときにモデル一覧を更新
  openrouterApiKeyInput.addEventListener('change', async () => {
    const apiKey = openrouterApiKeyInput.value.trim();
    try {
      const models = await fetchOpenRouterModels(apiKey);
      populateOpenRouterModelSelect(openrouterModelSelect, models);
    } catch (error) {
      console.error('APIキー変更時のモデル一覧取得エラー:', error);
    }
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

// OpenRouter APIキー検証処理
async function verifyOpenRouterApiKey(apiKey, statusElem, buttonElem) {
  if (!apiKey) {
    statusElem.textContent = 'APIキーを入力してください';
    statusElem.style.color = '#d32f2f';
    return;
  }
  buttonElem.disabled = true;
  statusElem.textContent = '検証中...';
  statusElem.style.color = '#666';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'chrome-extension://llm-translator',
        'X-Title': 'LLM Translation Plugin'
      }
    });
    if (response.ok) {
      const data = await response.json();
      console.log('OpenRouter モデル一覧:', data);
      statusElem.textContent = '✓ APIキーは有効です';
      statusElem.style.color = '#155724';
      
      // モデル一覧を更新
      const { openrouterModelSelect } = getElements();
      populateOpenRouterModelSelect(openrouterModelSelect, data.data || []);
    } else {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('OpenRouter APIキー検証エラー:', errorData);
      statusElem.textContent = `✗ APIキーが無効: ${errorData.error || response.statusText}`;
      statusElem.style.color = '#d32f2f';
    }
  } catch (error) {
    console.error('APIキー検証中にエラー:', error);
    try {
      await verifyOpenRouterApiKeyViaBackground(apiKey);
      statusElem.textContent = '✓ APIキーは有効です (バックグラウンド経由)';
      statusElem.style.color = '#155724';
      
      // モデル一覧を更新
      const models = await fetchOpenRouterModelsViaBackground(apiKey);
      const { openrouterModelSelect } = getElements();
      populateOpenRouterModelSelect(openrouterModelSelect, models);
    } catch (bgError) {
      console.error('バックグラウンド経由検証エラー:', bgError);
      statusElem.textContent = `✗ APIキー検証失敗: ${bgError.message || 'ネットワークエラー'}`;
      statusElem.style.color = '#d32f2f';
    }
  } finally {
    buttonElem.disabled = false;
  }
}

// Anthropic APIキー検証処理
async function verifyAnthropicApiKey(apiKey, statusElem, buttonElem) {
  if (!apiKey) {
    statusElem.textContent = 'APIキーを入力してください';
    statusElem.style.color = '#d32f2f';
    return;
  }
  buttonElem.disabled = true;
  statusElem.textContent = '検証中...';
  statusElem.style.color = '#666';

  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Anthropic モデル一覧:', data);
      statusElem.textContent = '✓ APIキーは有効です';
      statusElem.style.color = '#155724';
    } else {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('Anthropic APIキー検証エラー:', errorData);
      statusElem.textContent = `✗ APIキーが無効: ${errorData.error?.message || response.statusText}`;
      statusElem.style.color = '#d32f2f';
    }
  } catch (error) {
    console.error('APIキー検証中にエラー:', error);
    try {
      await verifyAnthropicApiKeyViaBackground(apiKey);
      statusElem.textContent = '✓ APIキーは有効です (バックグラウンド経由)';
      statusElem.style.color = '#155724';
    } catch (bgError) {
      console.error('バックグラウンド経由検証エラー:', bgError);
      statusElem.textContent = `✗ APIキー検証失敗: ${bgError.message || 'ネットワークエラー'}`;
      statusElem.style.color = '#d32f2f';
    }
  } finally {
    buttonElem.disabled = false;
  }
}

function verifyOpenRouterApiKeyViaBackground(apiKey) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'verifyOpenRouterApiKey',
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

function verifyAnthropicApiKeyViaBackground(apiKey) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'verifyAnthropicApiKey',
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
      useProxyServer: false // デフォルトは中間サーバーを利用しない
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
      if (settings.apiProvider === 'openrouter') {
        openrouterSection.classList.remove('hidden');
        geminiSection.classList.add('hidden');
        anthropicSection.classList.add('hidden');
      } else if (settings.apiProvider === 'gemini') {
        openrouterSection.classList.add('hidden');
        geminiSection.classList.remove('hidden');
        anthropicSection.classList.add('hidden');
      } else if (settings.apiProvider === 'anthropic') {
        openrouterSection.classList.add('hidden');
        geminiSection.classList.add('hidden');
        anthropicSection.classList.remove('hidden');
      }
      
      // モデルの選択状態は、モデル一覧が取得された後に設定される
      if (settings.openrouterModel) {
        setTimeout(() => {
          if (Array.from(openrouterModelSelect.options).some(opt => opt.value === settings.openrouterModel)) {
            openrouterModelSelect.value = settings.openrouterModel;
            
            // Select2の更新
            if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
              $(openrouterModelSelect).trigger('change');
              
              // モデル情報を更新
              const modelData = $(openrouterModelSelect).find(`option[value="${settings.openrouterModel}"]`).data('model');
              if (modelData) {
                updateModelInfo('openrouter', modelData);
              }
            }
          }
        }, 500); // モデル一覧の読み込み完了を待つための遅延
      }
      
      if (settings.anthropicModel) {
        setTimeout(() => {
          if (Array.from(anthropicModelSelect.options).some(opt => opt.value === settings.anthropicModel)) {
            anthropicModelSelect.value = settings.anthropicModel;
            
            // Select2の更新
            if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
              $(anthropicModelSelect).trigger('change');
              
              // モデル情報を更新
              const modelData = $(anthropicModelSelect).find(`option[value="${settings.anthropicModel}"]`).data('model');
              if (modelData) {
                updateModelInfo('anthropic', modelData);
              }
            }
          }
        }, 500); // モデル一覧の読み込み完了を待つための遅延
      }
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

function showStatus(element, message, isSuccess) {
  element.textContent = message;
  element.classList.remove('hidden', 'success', 'error');
  element.classList.add(isSuccess ? 'success' : 'error');
  if (isSuccess) {
    setTimeout(() => element.classList.add('hidden'), 3000);
  }
}