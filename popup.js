document.addEventListener('DOMContentLoaded', init);

function init() {
  const elements = getElements();
  initTabs(elements);
  setupApiProviderToggle(elements);
  createVerificationUI(elements);
  loadSettings(elements);
  bindEventHandlers(elements);
  loadAnthropicModels(elements);
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
      selectElement.appendChild(option);
    });
    
    // 前回選択していたモデルがあれば選択状態を復元
    if (selectedModel && Array.from(selectElement.options).some(opt => opt.value === selectedModel)) {
      selectElement.value = selectedModel;
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
    selectElement.appendChild(option);
  });
  
  // 前回選択していたモデルがあれば選択状態を復元
  if (selectedModel && Array.from(selectElement.options).some(opt => opt.value === selectedModel)) {
    selectElement.value = selectedModel;
  }
}

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
  const { saveButton, testButton, anthropicApiKeyInput, anthropicModelSelect } = elements;
  saveButton.addEventListener('click', () => saveSettings(elements));
  testButton.addEventListener('click', () => testApi(elements));
  
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
function loadSettings({ apiProviderSelect, openrouterApiKeyInput, openrouterModelSelect, geminiApiKeyInput, geminiModelSelect, anthropicApiKeyInput, anthropicModelSelect, openrouterSection, geminiSection, anthropicSection }) {
  chrome.storage.sync.get(
    {
      apiProvider: 'openrouter',
      openrouterApiKey: '',
      openrouterModel: 'openai/gpt-4o-mini',
      geminiApiKey: '',
      geminiModel: 'gemini-2.0-flash',
      anthropicApiKey: '',
      anthropicModel: 'claude-3-5-sonnet-20240620'
    },
    settings => {
      apiProviderSelect.value = settings.apiProvider;
      openrouterApiKeyInput.value = settings.openrouterApiKey;
      openrouterModelSelect.value = settings.openrouterModel;
      geminiApiKeyInput.value = settings.geminiApiKey;
      geminiModelSelect.value = settings.geminiModel;
      anthropicApiKeyInput.value = settings.anthropicApiKey;
      
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
      
      // Anthropicモデルの選択状態は、モデル一覧が取得された後に設定される
      if (settings.anthropicModel) {
        setTimeout(() => {
          if (Array.from(anthropicModelSelect.options).some(opt => opt.value === settings.anthropicModel)) {
            anthropicModelSelect.value = settings.anthropicModel;
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

// APIテスト処理
function testApi(elements) {
  const { testApiProviderSelect, testTextArea, testButton, testStatus, testResult } = elements;
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
      anthropicModel: 'claude-3-5-sonnet-20240620'
    },
    async settings => {
      try {
        testButton.disabled = true;
        showStatus(testStatus, 'テスト中...', true);
        testResult.classList.add('hidden');
        let result;
        
        if (apiProvider === 'openrouter') {
          if (!settings.openrouterApiKey) {
            showStatus(testStatus, 'OpenRouter APIキーが設定されていません', false);
            testButton.disabled = false;
            return;
          }
          result = await testOpenRouterViaBackground(testText, settings.openrouterApiKey, settings.openrouterModel);
        } else if (apiProvider === 'gemini') {
          if (!settings.geminiApiKey) {
            showStatus(testStatus, 'Gemini APIキーが設定されていません', false);
            testButton.disabled = false;
            return;
          }
          result = await testGeminiApi(testText, settings.geminiApiKey, settings.geminiModel);
        } else if (apiProvider === 'anthropic') {
          if (!settings.anthropicApiKey) {
            showStatus(testStatus, 'Anthropic APIキーが設定されていません', false);
            testButton.disabled = false;
            return;
          }
          result = await testAnthropicViaBackground(testText, settings.anthropicApiKey, settings.anthropicModel);
        }
        
        showStatus(testStatus, 'テスト成功！', true);
        testResult.textContent = result;
        testResult.classList.remove('hidden');
      } catch (error) {
        console.error('APIテストエラー:', error);
        showStatus(testStatus, `エラー: ${error.message}`, false);
        let errorDetails = error.stack || 'スタックトレース情報なし';
        if (error.additionalInfo) {
          errorDetails += '\n\n' + error.additionalInfo;
        }
        
        if (apiProvider === 'openrouter') {
          errorDetails +=
            '\n\n== トラブルシューティング ==\n' +
            '1. OpenRouterのAPIキーが正しいか確認してください\n' +
            '2. APIキーに十分なクレジットがあるか確認してください\n' +
            '3. OpenRouterのステータス (https://status.openrouter.ai/) を確認してください\n' +
            '4. ネットワーク接続に問題がないか確認してください';
        } else if (apiProvider === 'anthropic') {
          errorDetails +=
            '\n\n== トラブルシューティング ==\n' +
            '1. AnthropicのAPIキーが正しいか確認してください\n' +
            '2. APIキーに十分なクレジットがあるか確認してください\n' +
            '3. Anthropicのステータス (https://status.anthropic.com/) を確認してください\n' +
            '4. ネットワーク接続に問題がないか確認してください';
        }
        
        testResult.textContent = `詳細エラー情報:\n${errorDetails}`;
        testResult.classList.remove('hidden');
      } finally {
        testButton.disabled = false;
      }
    }
  );
}

function testOpenRouterViaBackground(text, apiKey, model) {
  return new Promise((resolve, reject) => {
    console.log(`OpenRouterをバックグラウンド経由でテスト中... モデル: ${model}`);
    chrome.runtime.sendMessage(
      {
        action: 'testOpenRouter',
        text: text,
        apiKey: apiKey,
        model: model
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error('バックグラウンドスクリプトへのメッセージ送信エラー:', chrome.runtime.lastError);
          return reject(new Error(`バックグラウンドスクリプトエラー: ${chrome.runtime.lastError.message}`));
        }
        if (response.error) {
          console.error('OpenRouter APIエラー:', response.error);
          const error = new Error(response.error.message || 'OpenRouter APIエラー');
          error.additionalInfo = response.error.details || '';
          return reject(error);
        }
        resolve(response.result);
      }
    );
  });
}

function testAnthropicViaBackground(text, apiKey, model) {
  return new Promise((resolve, reject) => {
    console.log(`Anthropicをバックグラウンド経由でテスト中... モデル: ${model}`);
    chrome.runtime.sendMessage(
      {
        action: 'testAnthropic',
        text: text,
        apiKey: apiKey,
        model: model
      },
      response => {
        if (chrome.runtime.lastError) {
          console.error('バックグラウンドスクリプトへのメッセージ送信エラー:', chrome.runtime.lastError);
          return reject(new Error(`バックグラウンドスクリプトエラー: ${chrome.runtime.lastError.message}`));
        }
        if (response.error) {
          console.error('Anthropic APIエラー:', response.error);
          const error = new Error(response.error.message || 'Anthropic APIエラー');
          error.additionalInfo = response.error.details || '';
          return reject(error);
        }
        resolve(response.result);
      }
    );
  });
}

async function testGeminiApi(text, apiKey, model) {
  console.log(`Geminiをテスト中... モデル: ${model}`);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `以下の文章を日本語に翻訳してください。翻訳結果のみを出力してください。\n\n${text}`
            }
          ]
        }
      ],
      generationConfig: { temperature: 0.2 }
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`API Error: ${errorData.error || response.statusText} (${response.status})`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

function showStatus(element, message, isSuccess) {
  element.textContent = message;
  element.classList.remove('hidden', 'success', 'error');
  element.classList.add(isSuccess ? 'success' : 'error');
  if (isSuccess) {
    setTimeout(() => element.classList.add('hidden'), 3000);
  }
}
