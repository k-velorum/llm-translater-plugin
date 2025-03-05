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
    $('#openrouter-model, #anthropic-model').on('select2:select', function(e) {
      const provider = this.id.split('-')[0]; // openrouter または anthropic
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

// モデル一覧の読み込み
function loadModels(elements) {
  loadProviderModels('openrouter', elements);
  loadProviderModels('anthropic', elements);
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

// モデル一覧をAPIから取得
async function fetchModels(provider, apiKey) {
  try {
    // 直接フェッチ試行
    const headers = {};
    let url = '';
    
    if (provider === 'openrouter') {
      url = 'https://openrouter.ai/api/v1/models';
      headers['HTTP-Referer'] = 'chrome-extension://llm-translator';
      headers['X-Title'] = 'LLM Translation Plugin';
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    } else if (provider === 'anthropic') {
      url = 'https://api.anthropic.com/v1/models';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    if (response.ok) {
      const data = await response.json();
      return provider === 'openrouter' ? data.data || [] : data.models || [];
    }
    
    // 直接フェッチが失敗した場合、バックグラウンド経由で試行
    return await fetchModelsViaBackground(provider, apiKey);
  } catch (error) {
    console.error(`${provider}モデル取得エラー:`, error);
    return await fetchModelsViaBackground(provider, apiKey);
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
    anthropic: [
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
    ]
  };
  
  // 現在選択されているモデルを保存
  const selectedModel = selectElement.value;
  
  // 既存のオプションをクリア
  selectElement.innerHTML = '';
  
  // デフォルトモデルでオプションを生成
  defaultModels[provider].forEach(model => {
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

export { 
  initSelect2, 
  formatModelOption, 
  updateModelInfo, 
  loadModels, 
  loadProviderModels, 
  fetchModels, 
  fetchModelsViaBackground, 
  populateModelSelect, 
  setDefaultModels 
};