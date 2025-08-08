# API Configuration

## OpenRouter API
### Endpoints
- **Chat Completions**: `https://openrouter.ai/api/v1/chat/completions`
- **Models List**: `https://openrouter.ai/api/v1/models`

### Request Structure
```javascript
{
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': chrome.runtime.getURL(''),
    'X-Title': 'LLM Translation Plugin'
  },
  body: JSON.stringify({
    model: selectedModel,
    messages: [
      { role: 'system', content: TRANSLATE_PROMPT },
      { role: 'user', content: textToTranslate }
    ],
    temperature: 0.7,
    max_tokens: 2000
  })
}
```

### Available Models
- Dynamic fetching from API
- Fallback defaults: gpt-4o-mini, anthropic/claude-3.5-haiku, anthropic/claude-3-5-sonnet-20241022
- Model format: `provider/model-name` or `model-name`

## Google Gemini API
### Endpoints
- **Generate Content**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- **Models List**: `https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}`

### Request Structure
```javascript
{
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contents: [{
      parts: [{
        text: `${TRANSLATE_PROMPT}\n\nテキスト：\n${textToTranslate}`
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000
    }
  })
}
```

### Available Models
- Dynamic fetching via API
- Default: gemini-1.5-flash
- Filter: Only models supporting `generateContent` method

## Ollama (Local LLM)
### Endpoints
- **Generate**: `http://localhost:11434/api/generate`
- **Models List**: `http://localhost:11434/api/tags`

### Request Structure
```javascript
{
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: selectedModel,
    prompt: `${TRANSLATE_PROMPT}\n\nテキスト：\n${textToTranslate}`,
    stream: false
  })
}
```

### Available Models
- Dynamic fetching from local server
- No authentication required

## LM Studio (OpenAI Compatible)
### Endpoints
- **Chat Completions**: `http://localhost:1234/v1/chat/completions`
- **Models List**: `http://localhost:1234/v1/models`

### Request Structure
```javascript
{
  method: 'POST',
  headers: {
    'Authorization': apiKey ? `Bearer ${apiKey}` : undefined,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: selectedModel,
    messages: [
      { role: 'system', content: TRANSLATE_PROMPT },
      { role: 'user', content: textToTranslate }
    ],
    temperature: 0.7,
    max_tokens: 2000
  })
}
```

### Available Models
- Dynamic fetching from local server
- Optional API key authentication

## Common Translation Prompt
```javascript
const TRANSLATE_PROMPT = `あなたは翻訳者です。以下のテキストを日本語に翻訳してください。
翻訳する際は以下の点に注意してください：
- 自然で読みやすい日本語にすること
- 原文の意味を正確に伝えること
- 文脈に応じて適切な敬語を使うこと
翻訳結果のみを返してください。説明や注釈は不要です。`;
```

## Error Response Handling
- Network errors: "ネットワークエラーが発生しました"
- API errors: Provider-specific error messages
- Rate limits: "APIリクエスト制限に達しました"
- Invalid API key: "APIキーが無効です"
- Local server not running: Logged as warning (servers may not always be running)

## Validation Methods
- **OpenRouter**: GET request to `/models` endpoint
- **Gemini**: GET request to `/models` with API key
- **Ollama**: GET request to `/api/tags` endpoint
- **LM Studio**: GET request to `/v1/models` endpoint
- All validate through background script message handlers