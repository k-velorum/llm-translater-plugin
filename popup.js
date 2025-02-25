document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の取得
  const apiProviderSelect = document.getElementById('api-provider');
  const openrouterSection = document.getElementById('openrouter-section');
  const geminiSection = document.getElementById('gemini-section');
  const openrouterApiKeyInput = document.getElementById('openrouter-api-key');
  const openrouterModelSelect = document.getElementById('openrouter-model');
  const geminiApiKeyInput = document.getElementById('gemini-api-key');
  const geminiModelSelect = document.getElementById('gemini-model');
  const saveButton = document.getElementById('save-button');
  const statusMessage = document.getElementById('status-message');
  
  // テスト関連の要素
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const testApiProviderSelect = document.getElementById('test-api-provider');
  const testTextArea = document.getElementById('test-text');
  const testButton = document.getElementById('test-button');
  const testStatus = document.getElementById('test-status');
  const testResult = document.getElementById('test-result');
  
  // APIキー検証ボタンの作成
  const openrouterVerifyContainer = document.createElement('div');
  openrouterVerifyContainer.style.marginTop = '10px';
  openrouterVerifyContainer.style.display = 'flex';
  openrouterVerifyContainer.style.justifyContent = 'space-between';
  openrouterVerifyContainer.style.alignItems = 'center';
  
  const openrouterKeyStatus = document.createElement('span');
  openrouterKeyStatus.style.fontSize = '12px';
  openrouterKeyStatus.style.color = '#666';
  openrouterKeyStatus.textContent = '';
  
  const openrouterVerifyButton = document.createElement('button');
  openrouterVerifyButton.textContent = 'APIキーを検証';
  openrouterVerifyButton.style.padding = '5px 10px';
  openrouterVerifyButton.style.fontSize = '12px';
  openrouterVerifyButton.style.backgroundColor = '#34a853';
  openrouterVerifyButton.style.width = 'auto';
  openrouterVerifyButton.addEventListener('click', verifyOpenRouterApiKey);
  
  openrouterVerifyContainer.appendChild(openrouterKeyStatus);
  openrouterVerifyContainer.appendChild(openrouterVerifyButton);
  
  // APIキー入力フィールドの後に挿入
  const openrouterKeyFormGroup = openrouterApiKeyInput.parentNode;
  openrouterKeyFormGroup.appendChild(openrouterVerifyContainer);
  
  // タブ切り替え
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // アクティブタブの切り替え
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // タブコンテンツの切り替え
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabId}-tab`) {
          content.classList.add('active');
        }
      });
    });
  });
  
  // 保存されている設定を読み込む
  loadSettings();
  
  // APIプロバイダーの変更イベント
  apiProviderSelect.addEventListener('change', () => {
    if (apiProviderSelect.value === 'openrouter') {
      openrouterSection.classList.remove('hidden');
      geminiSection.classList.add('hidden');
    } else {
      openrouterSection.classList.add('hidden');
      geminiSection.classList.remove('hidden');
    }
  });
  
  // 設定保存ボタンのイベント
  saveButton.addEventListener('click', saveSettings);
  
  // テストボタンのイベント
  testButton.addEventListener('click', testApi);
  
  // OpenRouterのAPIキーを検証する関数
  async function verifyOpenRouterApiKey() {
    const apiKey = openrouterApiKeyInput.value.trim();
    
    if (!apiKey) {
      openrouterKeyStatus.textContent = 'APIキーを入力してください';
      openrouterKeyStatus.style.color = '#d32f2f';
      return;
    }
    
    openrouterVerifyButton.disabled = true;
    openrouterKeyStatus.textContent = '検証中...';
    openrouterKeyStatus.style.color = '#666';
    
    try {
      // キー検証のため、モデル一覧を取得
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
        openrouterKeyStatus.textContent = '✓ APIキーは有効です';
        openrouterKeyStatus.style.color = '#155724';
      } else {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('OpenRouter APIキー検証エラー:', errorData);
        openrouterKeyStatus.textContent = `✗ APIキーが無効: ${errorData.error || response.statusText}`;
        openrouterKeyStatus.style.color = '#d32f2f';
      }
    } catch (error) {
      console.error('OpenRouter APIキー検証中にエラーが発生:', error);
      
      // バックグラウンド経由で試してみる
      try {
        await verifyOpenRouterApiKeyViaBackground(apiKey);
        openrouterKeyStatus.textContent = '✓ APIキーは有効です (バックグラウンド経由)';
        openrouterKeyStatus.style.color = '#155724';
      } catch (bgError) {
        console.error('バックグラウンド経由のOpenRouter APIキー検証エラー:', bgError);
        openrouterKeyStatus.textContent = `✗ APIキー検証失敗: ${bgError.message || 'ネットワークエラー'}`;
        openrouterKeyStatus.style.color = '#d32f2f';
      }
    } finally {
      openrouterVerifyButton.disabled = false;
    }
  }
  
  // バックグラウンド経由でOpenRouterのAPIキーを検証する関数
  function verifyOpenRouterApiKeyViaBackground(apiKey) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'verifyOpenRouterApiKey',
        apiKey: apiKey
      }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(`バックグラウンドスクリプトエラー: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        if (response.error) {
          reject(new Error(response.error.message || 'APIキー検証エラー'));
        } else {
          resolve(response.result);
        }
      });
    });
  }
  
  // 設定を読み込む関数
  function loadSettings() {
    chrome.storage.sync.get({
      apiProvider: 'openrouter',
      openrouterApiKey: '',
      openrouterModel: 'anthropic/claude-3.5-haiku',
      geminiApiKey: '',
      geminiModel: 'gemini-2.0-flash'
    }, (settings) => {
      // フォームに設定を反映
      apiProviderSelect.value = settings.apiProvider;
      openrouterApiKeyInput.value = settings.openrouterApiKey;
      openrouterModelSelect.value = settings.openrouterModel;
      geminiApiKeyInput.value = settings.geminiApiKey;
      geminiModelSelect.value = settings.geminiModel;
      
      // 適切なセクションを表示
      if (settings.apiProvider === 'openrouter') {
        openrouterSection.classList.remove('hidden');
        geminiSection.classList.add('hidden');
      } else {
        openrouterSection.classList.add('hidden');
        geminiSection.classList.remove('hidden');
      }
    });
  }
  
  // 設定を保存する関数
  function saveSettings() {
    // 入力値の取得
    const settings = {
      apiProvider: apiProviderSelect.value,
      openrouterApiKey: openrouterApiKeyInput.value.trim(),
      openrouterModel: openrouterModelSelect.value,
      geminiApiKey: geminiApiKeyInput.value.trim(),
      geminiModel: geminiModelSelect.value
    };
    
    // APIキーのバリデーション
    let isValid = true;
    let errorMessage = '';
    
    if (settings.apiProvider === 'openrouter') {
      if (!settings.openrouterApiKey) {
        isValid = false;
        errorMessage = 'OpenRouter APIキーを入力してください';
      }
    } else {
      if (!settings.geminiApiKey) {
        isValid = false;
        errorMessage = 'Gemini APIキーを入力してください';
      }
    }
    
    if (!isValid) {
      showStatus(statusMessage, errorMessage, false);
      return;
    }
    
    // 設定の保存
    chrome.storage.sync.set(settings, () => {
      showStatus(statusMessage, '設定を保存しました', true);
    });
  }

  // APIをテストする関数
  async function testApi() {
    const apiProvider = testApiProviderSelect.value;
    const testText = testTextArea.value.trim();
    
    if (!testText) {
      showStatus(testStatus, 'テスト文章を入力してください', false);
      return;
    }
    
    // 保存されている設定を読み込む
    chrome.storage.sync.get({
      openrouterApiKey: '',
      openrouterModel: 'anthropic/claude-3.5-haiku',
      geminiApiKey: '',
      geminiModel: 'gemini-2.0-flash'
    }, async (settings) => {
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
          
          // バックグラウンドスクリプト経由でOpenRouterをテスト
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
        
        // エラー詳細を表示
        let errorDetails = error.stack || 'スタックトレース情報なし';
        if (error.additionalInfo) {
          errorDetails += '\n\n' + error.additionalInfo;
        }
        
        // トラブルシューティング情報を追加
        if (apiProvider === 'openrouter') {
          errorDetails += '\n\n== トラブルシューティング ==\n';
          errorDetails += '1. OpenRouterのAPIキーが正しいか確認してください\n';
          errorDetails += '2. APIキーに十分なクレジットがあるか確認してください\n';
          errorDetails += '3. OpenRouterのステータス (https://status.openrouter.ai/) を確認してください\n';
          errorDetails += '4. ネットワーク接続に問題がないか確認してください';
        }
        
        testResult.textContent = `詳細エラー情報:\n${errorDetails}`;
        testResult.classList.remove('hidden');
      } finally {
        testButton.disabled = false;
      }
    });
  }
  
  // バックグラウンドスクリプト経由でOpenRouterをテストする関数
  function testOpenRouterViaBackground(text, apiKey, model) {
    return new Promise((resolve, reject) => {
      console.log(`OpenRouterをバックグラウンドスクリプト経由でテスト中... モデル: ${model}`);
      
      // バックグラウンドスクリプトにリクエストを委譲
      chrome.runtime.sendMessage({
        action: 'testOpenRouter',
        text: text,
        apiKey: apiKey,
        model: model
      }, response => {
        if (chrome.runtime.lastError) {
          console.error('バックグラウンドスクリプトへのメッセージ送信エラー:', chrome.runtime.lastError);
          reject(new Error(`バックグラウンドスクリプトエラー: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        if (response.error) {
          console.error('OpenRouter APIエラー:', response.error);
          const error = new Error(response.error.message || 'OpenRouter APIエラー');
          error.additionalInfo = response.error.details || '';
          reject(error);
        } else {
          resolve(response.result);
        }
      });
    });
  }
  
  // Gemini APIをテストする関数
  async function testGeminiApi(text, apiKey, model) {
    console.log(`Geminiをテスト中... モデル: ${model}`);
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
        generationConfig: {
          temperature: 0.2
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`API Error: ${errorData.error || response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  }
  
  // ステータスメッセージを表示する関数
  function showStatus(element, message, isSuccess) {
    element.textContent = message;
    element.classList.remove('hidden', 'success', 'error');
    element.classList.add(isSuccess ? 'success' : 'error');
    
    // エラーの場合は非表示にしない
    if (isSuccess) {
      // 3秒後に非表示
      setTimeout(() => {
        element.classList.add('hidden');
      }, 3000);
    }
  }
});