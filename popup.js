document.addEventListener('DOMContentLoaded', init);

// 共通ユーティリティ関数
const PopupUtils = {
  // APIキー変更ハンドラーを作成
  createApiKeyChangeHandler(provider, apiKeyInput, modelSelect) {
    return async () => {
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
  },

  // モデル選択復元処理
  restoreModelSelection(provider, modelSelect, modelValue) {
    if (!modelValue) return;
    
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
  },

  // APIキーのバリデーションとエラーメッセージを取得
  validateApiKey(apiProvider, settings) {
    const validationRules = {
      openrouter: { key: 'openrouterApiKey', message: 'OpenRouter APIキーを入力してください' },
      gemini: { key: 'geminiApiKey', message: 'Gemini APIキーを入力してください' },

    };
    
    const rule = validationRules[apiProvider];
    if (rule && !settings[rule.key]) {
      return { isValid: false, message: rule.message };
    }
    
    return { isValid: true, message: '' };
  }
};

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
    $('#openrouter-model, #gemini-model').on('select2:select', function(e) {
      const provider = this.id.split('-')[0]; // openrouter または gemini
      const modelId = e.params.data.id;
      const modelData = $(this).find(`option[value="${modelId}"]`).data('model');
      if (modelData) {
        updateModelInfo(provider, modelData);
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
  
  // モデルの場合
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
  } else if (provider === 'gemini') {
    infoText = `モデル: ${modelData.name}`;
    if (modelData.context_length) {
      infoText += `<br>入力上限: ${modelData.context_length} tokens`;
    }
  }
  
  infoElement.innerHTML = infoText;
}

// モデル一覧の読み込み
function loadModels(elements) {
  ['openrouter', 'gemini'].forEach(p => loadProviderModels(p, elements));
}

// 特定プロバイダーのモデル一覧を読み込む
function loadProviderModels(provider, elements) {
  const apiKeyInput = elements[`${provider}ApiKeyInput`];
  const modelSelect = elements[`${provider}ModelSelect`];
  
  // 保存されているAPIキーを取得
  chrome.storage.sync.get([`${provider}ApiKey`], async (settings) => {
    if (settings[`${provider}ApiKey`]) {
      try {
        const models = await fetchModels(provider, settings[`${provider}ApiKey`]);
        populateModelSelect(provider, modelSelect, models);
      } catch (error) {
        console.error(`${provider}モデル一覧の取得に失敗:`, error);
        // エラー時はデフォルトモデルを設定
        setDefaultModels(provider, modelSelect);
      }
    } else {
      // APIキーがない場合はデフォルトモデルを設定
      setDefaultModels(provider, modelSelect);
      
      // OpenRouterの場合は公開APIからモデル一覧を取得
      if (provider === 'openrouter') {
        try {
          const models = await fetchModels(provider);
          populateModelSelect(provider, modelSelect, models);
        } catch (error) {
          console.error('公開APIからのOpenRouterモデル一覧の取得に失敗:', error);
        }
      }
    }
  });
}

// モデル一覧を取得（常にバックグラウンド経由）
async function fetchModels(provider, apiKey) {
  try {
    return await fetchModelsViaBackground(provider, apiKey);
  } catch (error) {
    console.error(`${provider}モデル取得エラー:`, error);
    throw error;
  }
}

// バックグラウンド経由でモデル一覧を取得
function fetchModelsViaBackground(provider, apiKey) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: `get${provider.charAt(0).toUpperCase() + provider.slice(1)}Models`,
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

// モデル選択要素にモデル一覧をセット
function populateModelSelect(provider, selectElement, models) {
  // 現在選択されているモデルを保存
  const selectedModel = selectElement.value;
  
  // 既存のオプションをクリア
  selectElement.innerHTML = '';
  
  if (models && models.length > 0) {
    // 取得したモデルでオプションを生成
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.name || model.id} (${model.id})`;
      
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
          updateModelInfo(provider, modelData);
        }
      }
    }
  } else {
    // モデルが取得できない場合はデフォルトモデルをセット
    setDefaultModels(provider, selectElement);
  }
}

// デフォルトのモデルをセット
function setDefaultModels(provider, selectElement) {
  const defaultModels = {
    openrouter: [
      { id: 'openai/gpt-4o-mini', name: 'GPT 4o mini' },
      { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' },
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' }
    ],

  };
  
  // 現在選択されているモデルを保存
  const selectedModel = selectElement.value;
  
  // 既存のオプションをクリア
  selectElement.innerHTML = '';
  
  // デフォルトモデルでオプションを生成
  if (defaultModels[provider]) {
    defaultModels[provider].forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name;
    
    // モデルデータをdata属性に保存
    $(option).data('model', model);
    
    selectElement.appendChild(option);
  });
  }
  
  // 前回選択していたモデルがあれば選択状態を復元
  if (selectedModel && Array.from(selectElement.options).some(opt => opt.value === selectedModel)) {
    selectElement.value = selectedModel;
    
    // Select2の更新
    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
      $(selectElement).trigger('change');
    }
  }
}

function getElements() {
  return {
    // 設定用フォーム要素
    apiProviderSelect: document.getElementById('api-provider'),
    openrouterSection: document.getElementById('openrouter-section'),
    geminiSection: document.getElementById('gemini-section'),
    openrouterApiKeyInput: document.getElementById('openrouter-api-key'),
    openrouterModelSelect: document.getElementById('openrouter-model'),
    geminiApiKeyInput: document.getElementById('gemini-api-key'),
    geminiModelSelect: document.getElementById('gemini-model'),
    saveButton: document.getElementById('save-button'),
    statusMessage: document.getElementById('status-message'),
    // テスト用要素
    testApiProviderSelect: document.getElementById('test-api-provider'),
    testTextArea: document.getElementById('test-text'),
    testButton: document.getElementById('test-button'),
    testStatus: document.getElementById('test-status'),
    testResult: document.getElementById('test-result'),
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

function setupApiProviderToggle({ apiProviderSelect, openrouterSection, geminiSection }) {
  apiProviderSelect.addEventListener('change', () => {
    const sections = { openrouter: openrouterSection, gemini: geminiSection };
    
    // すべてのセクションを非表示にする
    Object.values(sections).forEach(section => section.classList.add('hidden'));
    
    // 選択されたプロバイダーのセクションを表示する
    sections[apiProviderSelect.value].classList.remove('hidden');
  });
}

function createVerificationUI(elements) {
  createProviderVerificationUI('openrouter', elements.openrouterApiKeyInput);
  createProviderVerificationUI('gemini', elements.geminiApiKeyInput);
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

function bindEventHandlers(elements) {
  const { saveButton, testButton, openrouterApiKeyInput, openrouterModelSelect, geminiApiKeyInput, geminiModelSelect } = elements;
  
  saveButton.addEventListener('click', () => saveSettings(elements));
  testButton.addEventListener('click', () => testApi(elements));
  
  // APIキーが変更されたときにモデル一覧を更新
  openrouterApiKeyInput.addEventListener('change', 
    PopupUtils.createApiKeyChangeHandler('openrouter', openrouterApiKeyInput, openrouterModelSelect));
    
  geminiApiKeyInput.addEventListener('change', 
    PopupUtils.createApiKeyChangeHandler('gemini', geminiApiKeyInput, geminiModelSelect));
}

// APIキー検証処理（常にバックグラウンド経由）
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
    await verifyApiKeyViaBackground(provider, apiKey);
    statusElem.textContent = '✓ APIキーは有効です';
    statusElem.style.color = '#155724';

    // モデル一覧を更新
    const models = await fetchModelsViaBackground(provider, apiKey);
    const elements = getElements();
    const modelSelect = elements[`${provider}ModelSelect`];
    populateModelSelect(provider, modelSelect, models);
  } catch (error) {
    console.error('APIキー検証エラー:', error);
    statusElem.textContent = `✗ APIキー検証失敗: ${error.message || 'ネットワークエラー'}`;
    statusElem.style.color = '#d32f2f';
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

// 設定の読み込み
function loadSettings({ 
  apiProviderSelect, 
  openrouterApiKeyInput, 
  openrouterModelSelect, 
  geminiApiKeyInput, 
  geminiModelSelect, 
  openrouterSection, 
  geminiSection
}) {
  chrome.storage.sync.get(
    null,
    settings => {
      apiProviderSelect.value = settings.apiProvider;
      openrouterApiKeyInput.value = settings.openrouterApiKey;
      openrouterModelSelect.value = settings.openrouterModel;
      geminiApiKeyInput.value = settings.geminiApiKey;
      geminiModelSelect.value = settings.geminiModel;
      
      // APIプロバイダーに応じたセクションの表示制御
      const sections = {
        openrouter: openrouterSection,
        gemini: geminiSection
      };
      
      // すべてのセクションを非表示にする
      Object.values(sections).forEach(section => section.classList.add('hidden'));
      
      // 選択されたプロバイダーのセクションを表示する
      sections[settings.apiProvider].classList.remove('hidden');
      
      // モデルの選択状態を復元
      PopupUtils.restoreModelSelection('openrouter', openrouterModelSelect, settings.openrouterModel);
    }
  );
}

// 設定の保存
function saveSettings({ apiProviderSelect, openrouterApiKeyInput, openrouterModelSelect, geminiApiKeyInput, geminiModelSelect, statusMessage }) {
  const settings = {
    apiProvider: apiProviderSelect.value,
    openrouterApiKey: openrouterApiKeyInput.value.trim(),
    openrouterModel: openrouterModelSelect.value,
    geminiApiKey: geminiApiKeyInput.value.trim(),
    geminiModel: geminiModelSelect.value
  };

  const validation = PopupUtils.validateApiKey(settings.apiProvider, settings);
  
  if (!validation.isValid) {
    showStatus(statusMessage, validation.message, false);
    return;
  }
  
  chrome.storage.sync.set(settings, () => {
    showStatus(statusMessage, '設定を保存しました', true);
  });
}

// APIテスト処理（実際の翻訳処理を利用）
function testApi(elements) {
  const { testApiProviderSelect, testTextArea, testButton, testStatus, testResult } = elements;
  const apiProvider = testApiProviderSelect.value;
  const testText = testTextArea.value.trim();
  if (!testText) {
    showStatus(testStatus, 'テスト文章を入力してください', false);
    return;
  }
  chrome.storage.sync.get(
    null,
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
          openrouterModel: settings.openrouterModel
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
