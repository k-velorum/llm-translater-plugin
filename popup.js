document.addEventListener('DOMContentLoaded', init);

function init() {
  const elements = getElements();
  initTabs(elements);
  setupApiProviderToggle(elements);
  createVerificationUI(elements);
  loadSettings(elements);
  bindEventHandlers(elements);
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
    if (apiProviderSelect.value === 'openrouter') {
      openrouterSection.classList.remove('hidden');
      geminiSection.classList.add('hidden');
    } else {
      openrouterSection.classList.add('hidden');
      geminiSection.classList.remove('hidden');
    }
  });
}

function createVerificationUI({ openrouterApiKeyInput }) {
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

  verifyButton.addEventListener('click', () => {
    const apiKey = openrouterApiKeyInput.value.trim();
    verifyOpenRouterApiKey(apiKey, keyStatus, verifyButton);
  });

  container.appendChild(keyStatus);
  container.appendChild(verifyButton);
  openrouterApiKeyInput.parentNode.appendChild(container);
}

function bindEventHandlers(elements) {
  const { saveButton, testButton } = elements;
  saveButton.addEventListener('click', () => saveSettings(elements));
  testButton.addEventListener('click', () => testApi(elements));
}

// APIキー検証処理（バックグラウンド経由も含む）
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

// 設定の読み込み
function loadSettings({ apiProviderSelect, openrouterApiKeyInput, openrouterModelSelect, geminiApiKeyInput, geminiModelSelect, openrouterSection, geminiSection }) {
  chrome.storage.sync.get(
    {
      apiProvider: 'openrouter',
      openrouterApiKey: '',
      openrouterModel: 'openai/gpt-4o-mini',
      geminiApiKey: '',
      geminiModel: 'gemini-2.0-flash'
    },
    settings => {
      apiProviderSelect.value = settings.apiProvider;
      openrouterApiKeyInput.value = settings.openrouterApiKey;
      openrouterModelSelect.value = settings.openrouterModel;
      geminiApiKeyInput.value = settings.geminiApiKey;
      geminiModelSelect.value = settings.geminiModel;
      if (settings.apiProvider === 'openrouter') {
        openrouterSection.classList.remove('hidden');
        geminiSection.classList.add('hidden');
      } else {
        openrouterSection.classList.add('hidden');
        geminiSection.classList.remove('hidden');
      }
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

  let isValid = true;
  let errorMessage = '';
  if (settings.apiProvider === 'openrouter' && !settings.openrouterApiKey) {
    isValid = false;
    errorMessage = 'OpenRouter APIキーを入力してください';
  } else if (settings.apiProvider !== 'openrouter' && !settings.geminiApiKey) {
    isValid = false;
    errorMessage = 'Gemini APIキーを入力してください';
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
      geminiModel: 'gemini-2.0-flash'
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
        } else {
          if (!settings.geminiApiKey) {
            showStatus(testStatus, 'Gemini APIキーが設定されていません', false);
            testButton.disabled = false;
            return;
          }
          result = await testGeminiApi(testText, settings.geminiApiKey, settings.geminiModel);
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
