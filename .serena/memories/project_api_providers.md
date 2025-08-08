# API Providers

## Currently Supported Providers

### OpenRouter API
- **Access Method**: Direct browser-to-API communication
- **Authentication**: Bearer token (API key)
- **Model Selection**: Dynamic fetch from API with Select2 dropdown
- **Default Models**: gpt-4o-mini, claude-3.5-haiku, claude-3-5-sonnet
- **CORS**: Handled via extension permissions

### Google Gemini API
- **Access Method**: Direct browser-to-API communication  
- **Authentication**: API key as query parameter
- **Model Selection**: Dynamic fetch from API
- **Default Model**: gemini-1.5-flash
- **CORS**: Native support for browser extensions

### Ollama (Local LLM)
- **Access Method**: Local server communication (http://localhost:11434)
- **Authentication**: None required (local server)
- **Model Selection**: Dynamic fetch from /api/tags endpoint
- **Default Server**: http://localhost:11434
- **Translation Endpoint**: /api/generate
- **Note**: Server must be running locally

### LM Studio (OpenAI Compatible)
- **Access Method**: Local OpenAI-compatible server
- **Authentication**: Optional API key
- **Model Selection**: Dynamic fetch from /v1/models endpoint
- **Default Server**: http://localhost:1234
- **Translation Endpoint**: /v1/chat/completions (OpenAI format)
- **Note**: Server must be running locally

## Settings Storage Structure
```javascript
{
  apiProvider: 'openrouter' | 'gemini' | 'ollama' | 'lmstudio',
  openrouterApiKey: string,
  openrouterModel: string,
  geminiApiKey: string,
  geminiModel: string,
  ollamaServer: string,
  ollamaModel: string,
  lmstudioServer: string,
  lmstudioModel: string,
  lmstudioApiKey: string
}
```

## UI Configuration
- **Popup Interface**: 2-tab structure (Settings, Test)
- **Model Selection**: Select2 enhanced dropdowns
- **API Key Management**: Secure storage in chrome.storage.sync
- **Validation**: Live API key testing before saving
- **Local Server Support**: Ollama and LM Studio sections added
- **Error Handling**: Reduced to warn level for local server connection failures (servers may not always be running)