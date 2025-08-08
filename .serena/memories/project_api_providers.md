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

## Settings Storage Structure
```javascript
{
  apiProvider: 'openrouter' | 'gemini',
  openrouterApiKey: string,
  openrouterModel: string,
  geminiApiKey: string,
  geminiModel: string
}
```

## UI Configuration
- **Popup Interface**: 2-tab structure (Settings, Test)
- **Model Selection**: Select2 enhanced dropdowns
- **API Key Management**: Secure storage in chrome.storage.sync
- **Validation**: Live API key testing before saving